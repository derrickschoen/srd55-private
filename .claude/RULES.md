# Standing rules (D552)

Compacted 2026-09-05 15:20 by the supervisor from D1–D555 (codex draft, supervisor-installed, codex-reviewed). The append-only chronology `.claude/decisions.md` remains the record and wins on conflict; interim resolutions of conflicting rules live in `.claude/RULE-CONFLICTS.md` (D555). Compaction pass at least once a day; each pass replaces this header line's date.

## Licensing wall & provenance

- Never commit or distribute unauthorized work, and keep user-imported rules text and private content out of public repositories, artifacts, exports, and minted share links. [D57/D59/D330]
- Admit SRD 5.2.1, SRD 5.1, A5E SRD, CC0/public-domain, MIT, Apache, and other cleared sources only under their actual terms, attribution, and row-level provenance. [D367/D395]
- Segregate CC-BY-SA and OGL content in licence-complete dedicated folders, and never let their terms or text leak into engine code or other content. [D176/D395.2]
- Keep BG3/Larian/wiki evidence and non-SRD character content, builds, or oracle overlays private or user-imported unless separately cleared. [D260.9/D330/D370/D491/D492/D500]
- Publish only neutrally named, independently designed, SRD-clean mechanics and invented generalized fixtures produced through the clean-room process. [D318/D353/D491/D500]
- Keep audit evidence private; publish only a licensing-gate outcome and lawful clean-room methodology. [D244/D250/D290]
- Make SRD attribution reachable from every screen rendering SRD content and include it in printouts, exports, and agent-readable blocks. [F1/D125]
- License project-owned code under MIT, generated art and generator output under CC0 1.0, original public documentation under CC-BY-4.0, and SRD material under its existing CC-BY-4.0 terms; generate public art only from repository code and clean-room principles. [D126/D290/D316/D505/D515/D547]
- Exclude protected game names and marks from product identity and public clean-room content except where a licence notice or factual citation requires them. [D114/D178/D529]

## Roles & who implements/reviews

- Make Codex the default planner and high-effort implementer for substantive work, using Sol for complex work and Terra only as fallback. [AGENTS.md/model routing; standing/D530]
- Make the supervisor own contracts, arbitration, independent verification, gates, merges, and decisions-log entries, and keep that evidence distinct from lane claims. [D237/CLAUDE.md/standing]
- Make Codex review every ordinary unit before merge, and use a model other than the artifact's author as the decisive independent reviewer. [D135/D249/D390]
- Reserve Sonnet for the verified-KB second-reader role only; let it decide nothing. [standing]
- Never substitute a Claude implementer when Codex is unavailable or out of credits; stop loudly. [standing]
- Use Codex for classic and resumed iso art rounds; use Fable for implementation only when its design judgment is specifically needed, explained, and owner-approved. [D532]
- Keep the iso lane paused after the already-running D13 unit; dispatch no new iso implementation, review, or probe work until the owner lifts the pause. [D531]
- Let the owner alone make owner rulings, outward-facing approvals, product-taste calls, and changes to binding scope. [D169/D175/standing]

## Dispatch rules & COMMON RULES

- Read the worktree rules, lane state, and applicable decisions before acting, let the newest ruling win, and prepend the maintained `COMMON RULES` source to every supervised dispatch. [COMMON RULES/D552]
- Send Codex prompts through stdin files and forbid every lane from invoking Claude, nested Codex, or another agent CLI; only supervisor-run reviews carry gate weight. [D207/COMMON RULES/standing]
- Start each lane from current main in its own worktree and database, use one worktree per experiment or strategy, and copy and verify every ignored plan file there before dispatch. [D248/D487/D511/supervisor ruling after D509]
- Forbid lanes from repository operations, and require them to stop when work needs a frozen artifact, forbidden file, config change, another lane's files, or ungranted authority. [COMMON RULES]
- Give file-producing analysis a writable workspace-local or `/tmp` output path or require the complete deliverable on stdout; never assume an external symlink target is writable. [supervisor findings after D460/D487]
- Install dependencies in a fresh worktree before running its checks. [standing]
- Forbid mint-free lanes from changing schema, existing migrations, or wire schemas; make mint lanes add only the verified next registry number and update schema, migration, inventory, and checksums in lockstep without altering old migrations. [COMMON RULES/D203]
- Update `docs/specs/*.schema.json` only by the repository schema generator, show the command and diff, and hand-edit no generated schema artifact. [supervisor ruling after D525]
- Create plan filenames as `YYYY-MM-DD-meaningful-name.md`, keep them under 80 characters, and verify locally knowable assumptions before finalizing. [AGENTS.md]
- Stop loudly on service outage, credit refusal, missing credentials, absent binding input, or an infeasible brief; never fabricate a substitute result. [standing/supervisor findings]

## Gates, locks, ports, quiet-machine

- Run and read gates yourself before reporting verified green, and use `npx tsc -b --force` for every compile gate and mutation check. [D237/supervisor ruling 2026-09-03 14:30]
- Require long Codex gates to write an explicit exit-code done file; treat an absent file or empty log as not run. [supervisor ruling 2026-09-04 00:40]
- Run `sg scan`, applicable Vitest, and Playwright in every routine landing gate with actual counts and exit results; run full Playwright on main and UI/snapshot lanes, and touched specs on non-UI lanes. [D510.2/supervisor policy 2026-09-04 14:58]
- Serialize full Vitest, Playwright, and production-build work through `/tmp/dnd-gate.lock`. [D511/supervisor correction]
- Use a unique worktree-derived port for each browser gate, never share a port, and run no Vitest while Playwright owns the machine gate. [D105/supervisor correction after D511/standing]
- Let arena/API work run beside implementation lanes but yield to locked gates and record load; discard and quietly rerun timing evidence collected under load. [D237/D264/D511/D540]
- Raise timeouts only for the tests named by D544, and give a failed known flake one serial quiet retry under the gate lock with both outcomes reported. [D544]
- Keep all other budgets fixed; do not edit configuration, weaken assertions, or enlarge timeouts merely to reach green. [standing/COMMON RULES]
- Run each merge alone, check its direct status, require a clean tree and signature symbol before it, and rerun the main gate plus landed-change check after it. [F23/supervisor ruling 2026-09-05 08:26/standing]
- Supply a Spec/Affected/Why table for every changed Playwright spec; reject a bare filename list. [COMMON RULES]

## Mutations & verification

- Give every load-bearing assertion a named compiling behavioral mutation and exact killing test; declare compiler-rejected type mutants void and replace them. [COMMON RULES/supervisor ruling 2026-09-03 14:30]
- Make mutation scripts fail on a missing target, print the mutated line, and prove the replacement count before interpreting results. [F25/supervisor ruling after D449]
- Restore byte-for-byte, prove restoration, and rerun the killing test; restore untracked files from explicit backups and never use `git checkout -- <path>` around uncommitted work. [F28/supervisor ruling after D443/standing]
- Never mutate a worktree while any suite or gate is running in that worktree. [standing/supervisor ruling 2026-09-05 07:37]
- Record a surviving mutant in the commit message and decisions log, and make a killing test the next increment's required first item; do not block landing solely for the survivor. [D539]
- Add a lawful-payload acceptance control to every matcher or validator change so an over-refusing guard cannot masquerade as a fix. [standing]
- Never delete a retained test for green, weaken it, add skip/todo/ignore/any escapes, or self-generate its oracle; delete only when its subject is removed. [D7/D9/D25/COMMON RULES]
- Verify behavior rather than indirect proxies, and require either duplicate expression of one rule to be independently killed or consolidate the rule. [F16/F22]

## Reporting & the decisions log

- Report status tersely with what Codex did, what the supervisor independently verified, and real numbers; answer owner questions with enough context and reasoning. [CLAUDE.md]
- Never collapse lane claims into supervisor verification, and record project or supervisor mistakes with their impact and correction. [D237/CLAUDE.md/F19]
- Use one line for an idle tick and omit already-known framing. [CLAUDE.md]
- Keep `.claude/decisions.md` append-only and owner/supervisor-written unless an owner explicitly scopes a rewrite, and cite D/F identifiers rather than line numbers. [D230/F17/standing]
- Let the latest ruling supersede earlier rulings and guidance; keep `.claude/RULES.md` as current rules and `.claude/decisions.md` as chronology. [D552/AGENTS.md]
- Compact `.claude/RULES.md` at least daily, date the compaction, fold in new rulings, and remove superseded rules. [D552]
- Record evidence-backed supervisor arbitration without waiting for owner confirmation, and report unapplied mutations, interruptions, voids, retries, confounds, or deviations without folding them into green. [D543/standing]
- Keep harmless noise out of the mistake register, but never omit a finding that could produce a false report or wrong artifact. [standing]

## Arena & experiments

- Use structured engine state as the AI DM's primary channel and a captured board image as default redundant context; use text-only only in experiments specifically about picture presence. [D522/D535/D538]
- Keep `mcp_minimal` as the normal production transport and control; treat `final_indices` as an experimental comparator, not the default. [D503/D507]
- Require each actor decision and override to carry bounded, typed, non-boilerplate reasons traceable through option, expectation, execution, and score; keep reasons in rows and keys but hide them from judges unless preregistered. [D485/D489/D490]
- Present engine-computed ranked recommendations from typed intel, leave final choice to the DM, and never auto-select on prose heuristics. [D461]
- Optimize monster advice for confirmed kills, then expected damage and closing ETA, using deterministic coordination, observed facts, and typed inference rather than hidden omniscience. [D462/D476 supersedes D418.1/D477]
- Run all AI-DM testing under standard per-combatant initiative; isolate initiative variants as separately labelled experiments. [D421.4]
- Preregister arms, variables, seeds, budgets, censoring, primes, success, and unsealing, then compare one declared variable on the same code era and frozen inputs and re-anchor after an era shift. [D418.3/D429/D442/D445/D472]
- Record model, effort, transport, planner, instruction source/hash, repo commit, load average, prompt bytes, reasons, outcomes, rejections, image generation, and session linkage in each row. [D414/D489/supervisor findings after D510]
- Flag rounds over 120 seconds, void an arm after more than three timeouts, treat CLI exits as outage evidence, run low/medium experiments at 120/240 seconds, and keep live play at 180 seconds. [D448/D473/D511/supervisor outage ruling]
- Keep a play sitting in one model session across rounds and rooms, including summaries and all prior-round images for serious encounters; roll over by deterministic digest only at the measured threshold and retain fresh context as a control. [D450/D457/D551]
- Accept image-arm UI feedback once after the decision as typed non-scoring data, ask judges separately, tag every screenshot generation without mixing generations, and attach the executed fallback's own reason. [D504/D513.1/D513.3/supervisor ruling after D503]

## Comprehension probe & bars

- Gate picture-experiment reruns on every fact class scoring at least 0.9 at Luna MEDIUM, report medium first, and treat Luna low as measured research-only data. [D536 supersedes D525/D526]
- Run one 24-board probe per candidate and rerun with another seed when any class lies within 0.05 of 0.9; require the combined score to pass. [D541]
- Score probe answers against typed DM truth rather than inferred picture labels, and keep probe rows separate from arena rows and judged packets. [D519]
- Sweep tile scale and board offset before attributing a low score to the art rather than image-patch alignment. [D535]
- Validate capture dimensions, revision/round/digest, non-empty pixels, non-uniformity, luminance, and entropy before any model call; hard-fail invalid captures. [D535]
- Extend probes to before/after pairs scored against the engine event log, and give models only a versioned general board primer with no room-specific facts. [D523/D524/D535]
- Force every annotation layer on for probes and AI-DM snapshots, keep the image enabled regardless of null tactical benefit, and use results to improve it rather than decide its existence. [D537/D538]

## Classic board

- Maintain one classic board with independently switchable persisted annotation layers, force them on in snapshot mode, and judge both layers-off human and layers-on AI views. [D537]
- Give every creature a stable encounter number and distinguishable colour, show both on its token, and map them to full name, side, HP band, and cell in a roster outside the grid. [D533]
- Never encode facts by colour alone, and draw only engine-known mechanical objects while converting other decoration to non-mechanical art or omitting it. [D545/D549]
- Hide a hidden creature's token and cell from players, showing ordinary floor or a last-seen ghost only when player knowledge supports it, and clear the ghost when seen or known dead. [D545/supervisor ruling 2026-09-05 08:50]
- Draw every movement option's path with its option index, distance, over-budget segment, difficult/damaging terrain, and opportunity-attack trigger arrow. [D512]
- Use the full DM view for AI-DM and judge captures while structured prose governs monster knowledge, and use `capture_only` controls so pictures do not unblind treatment. [D506/D521]
- Keep classic board and probe work first in gate-lock and model-seat priority until the D536 medium comprehension bar passes. [D540]
- Preserve modern high-resolution retro-inspired presentation without lifting any game's assets, palette, names, or exact art. [D516]

## Iso view

- Keep iso as a playable alternative view over the same `EncounterState`, with hover, selection, movement preview, and turn controls rather than a static mockup. [D505/D508]
- Keep classic as the default route and expose iso only through the selector until a clean LAND verdict with no verified blocker or major authorizes merge. [D505/D526/D528/supervisor iso review]
- Keep iso work paused after D13 and dispatch neither the art pass, further reviews, coordinate/legend unit, nor new iso probes until the owner lifts D531. [D531]
- Use Codex for resumed iso implementation unless Fable design judgment is explicitly justified and owner-approved. [D532]
- Preserve the 2:1 dimetric, integer-scale, fit-to-room rendering, modern retro pixel-art direction, mood lighting, and translucent near walls. [D515/D517]
- Let engine mechanics cap lighting and determine scene truth, while drawing `engine_1x1` footprints until a separately reviewed footprint-integration unit lands. [D511/D529 arbitration/supervisor iso review]
- Use the opened clean-room art documents as implementer authority and keep judges-only research unavailable to implementers. [D542/clean-room open]

## Footprints/engine

- Keep one typed rules engine shared by VTT and simulator with pluggable controllers; encode absence, IDs, ranges, counters, relations, exhaustive variants, and extensible known-set-plus-passthrough vocabularies in types. [D25/D38/D269/D312/D388]
- Treat the engine as authoritative for legality and resolution; let AI agents propose typed intents and fail closed without partial execution. [D315.2/D396]
- Model footprints as 1×1 Medium-or-smaller, 2×2 Large, 3×3 Huge, and 4×4 Gargantuan with north-west anchors, allowing up to four stacked Tiny creatures per cell. [D511/D513]
- Require authored opening topology and never infer apertures merely from obstacle placement. [D513]
- Auto-relocate a growth, reversion, or return that no longer fits to the nearest legal anchor by Chebyshev distance then row-major order; refuse typed if none exists. [D514 supersedes D513.5]
- Count only newly entered cells for step costs and entry hazards, evaluate ongoing effects over the full footprint, and treat intervening creatures as Half Cover with default-off three-quarters cover. [D514]
- Reveal the full footprint of a detected creature and none of a hidden creature's current footprint to players. [D513/D545]
- Migrate old sessions and replays one way to explicit normal movement, preserving known sizes and using validated migration-only pending adjudication when size is unknown; never guess Medium. [D514/supervisor ruling 2026-09-05 05:40]
- Offer a base attack whenever its primary resolution works, attach typed omitted-rider data, and never silently drop the rider. [D454]
- Remove provably no-effect options from the AI offer set, keep them labelled and last for humans, and log every hidden option. [D453/D488]
- Keep non-SRD tactics symmetric and default-off in validated `EncounterConfig<'tactical_v2'>`, and generate public API schemas from one typed source with strict invariant tests and a live pre-arm probe. [D501/D502/supervisor rulings 2026-09-04 00:45]
- Treat an experimental row field as shipped only when the arena's persisted row passes the packet builder in a test. [supervisor ruling 2026-09-04 03:30]

## Review panels & judging

- Score every experiment packet with the full three-seat Sol-high, Opus, and fresh-context Fable panel. [D464]
- Give judges screenshots for both arms and blind identity, model, effort, profile, transport, labels, era, and treatment. [D418 rerun record/D442/D521]
- Recompute totals from rubric components, zero refused rows, drop service-null pairs, and validate sequence, uniqueness, ranges, counts, and sums before unsealing. [D443/D498 supervisor protocol]
- Compare scores within a packet only; never compare absolute panel totals across separately judged packets. [supervisor D498 unseal verdict]
- Keep packet keys sealed until the preregistered unsealing point or an explicit owner ruling opens them. [D442/D498/D503]
- Run intermediate art rounds through four seats: Fable, Opus-medium, Codex Sol-high, and a second Codex Sol-medium seat with a different rotated perspective. [D532 amendment]
- Run landing-candidate art rounds through fifteen seats: three model families across art direction, game feel, pixel craft, human readability, and machine readability. [D529/D532]
- Rotate all five perspectives before landing, HOLD on any supervisor-verified blocker or major, and settle disagreement by evidence rather than vote. [D528/D532/D543]
- Continue first-subsystem review until clean without a round cap; cap ordinary consensus loops at three rounds unless a later ruling says otherwise. [D247/standing]
- Measure each review seat's raised, confirmed, unique, and false-positive findings, and drop seats that do not earn their cost. [D535.3]
- Give arena judging priority over shared-account art-review seats. [D525]
- Never inspect sealed-agent stdout beyond explicit status/count markers, because patches and result fragments can unblind the supervisor. [supervisor blinding ruling 2026-09-02]

## Research programme & clean-room

- Store BG3, art-prior-art, optional-rules, model-training, and non-SRD research in private repositories with no remote unless separately authorized. [D417/D419/D491/D529]
- Use sources from March 2026 onward for current AI/game-workflow and AI-plays-D&D surveys, citing older work only as lineage. [D413/D534]
- Keep third-party images out of research storage and separate linked, source-aware judges-only notes from clean-room implementer documents. [D529]
- Write clean-room documents in original language as principles, measurable rules, and project defaults, with no game names, lifted wording, palettes, assets, or single-source constants. [D529]
- Open clean-room material to implementers only after both Codex leakage review and an independent Opus-medium leakage review say CLEAN. [D542]
- Treat `clean-room/final/` v3 as the current art-design authority and keep `judges-only/` closed to implementers. [clean-room open 2026-09-05]
- Keep BG3 capture work on Tactician, begin with five same-save mud-mephit runs, mark unreadable turns unknown, and never guess. [D492/D493/D497]
- Use written technical accounts and reverse-engineering as primary BG3 policy evidence, with videos and Script Extender logs as private verification. [D494/D496]
- Use private BG3 constants only as calibration targets; independently choose and document public neutral mechanics. [D500]
- Keep the deterministic headless Blender 3D-to-sprite pilot on the backlog and isolated from the public tree until scheduled. [D535]

## Accessibility, licensing of art, saves, memory

- Make every fact readable without colour through a glyph, number, or text, preserve keyboard focus, and honor reduced motion in both board views. [D549]
- Provide persisted colour-blind and high-contrast modes and never remove a non-colour cue merely for appearance. [D549]
- Provide a full semantic screen-reader board with creatures, cells, sides, HP bands, conditions, hidden or last-seen state, terrain, light, doors, fog, blockers, adjacency, and reach. [D549]
- Export the screen-reader board as standalone HTML and expose `board.html` beside the PNG through the snapshot MCP surface. [D549]
- Keep generated art under CC0, project code under MIT, and SRD content under its CC-BY attribution without cross-relicensing. [D547]
- Keep saves disposable and one-way-migrated until public release, then preserve compatibility; autosave every reducer revision with pending decisions, RNG, and model-session identity for exact mid-round resume. [D315.10/D550]
- Maintain per-round and encounter-boundary autosave pools of ten each, never touching named saves. [D377.9]
- Mirror browser saves to a file through the local bridge, maintain a BG3-style save manager, and keep a bounded migration window for shared saves. [D317.2/D317.3/D373.6]
- Open a second tab read-only with ownership and staleness banners; allow takeover only after the owning tab is genuinely gone. [D284]
- Keep hidden state out of player projections and player network documents; let the DM projection retain complete authority. [D260.2/D260.8/D359]
- Preserve one AI session across a play sitting, store its id with the session, and carry engine summaries plus all prior-round pictures during serious multi-round play. [D397.3/D457/D551]
- Enforce the live 180-second wall, default to the engine recommendation on timeout, and durably log the turn, actors, elapsed time, effort, and fallback. [D463/D473]

## Backlog/paused

- Prioritize classic-board and comprehension-probe work for the next few days until the D536 Luna-medium bar passes. [D540]
- Keep iso implementation, iso reviews, its coordinate/legend unit, its next art pass, and new iso probes paused until the owner lifts D531. [D531]
- Keep the Blender 3D-to-sprite pilot on the backlog and do not schedule it now. [D535]
- Continue conditions, tactical-v2, graph-slice, footprints follow-up, accessibility, and other engine lanes in parallel, but make them yield the gate lock and model seats to picture-first work. [D540]
- Continue AI-only evaluation and do not schedule a human playtest until the feature set is complete. [D546]
- Keep sustained local-model training parked until the authorized corpus is very large; build and smoke the tooling only. [D411/D414]
- Keep BFRD/Tales of the Valiant adoption deferred until the active intel and rerun programmes are done. [D421.6]
- Keep Pi and OpenCode adapters shelved with loud unverified status until their upstream or credential release gates change. [D400]
- Treat the first public version as one usable VTT containing the builder, trustworthy engine, tabletop, and AI DM; do not declare any single lane the product. [D548]
- Never push, publish, deploy, send, create outward resources, or start a tunnel without explicit current authorization. [standing]
- Keep publication and Cloudflare deployment stopped until owner approval, and use pre-alpha replacement freedom without deleting tests for green, self-generating expectations, or losing protected user data. [D25/D121/D266/D550]
