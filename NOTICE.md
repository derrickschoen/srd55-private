# Notices and attribution

This file is the attribution inventory for material that could be included in
a public release of this project. Paths are relative to the repository root.

## SRD 5.2 material (CC-BY-4.0)

The following notice applies to material derived from the System Reference
Document 5.2:

> This work includes material from the System Reference Document 5.2
> ("SRD 5.2") by Wizards of the Coast LLC, available at
> https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
> Commons Attribution 4.0 International License, available at
> https://creativecommons.org/licenses/by/4.0/legalcode.

The repository's attribution requirements and source provenance are recorded
in `docs/srd/ATTRIBUTION.md` and `docs/srd/SOURCE.md`.

### Checked-in reference material

The complete converted reference text is
`docs/srd/full/srd-5.2.1.txt`. The following attributed extracts are in
`docs/srd/source/`:

- `ability-score-generation.txt`
- `armor-table.txt`
- `attack-class-features.txt`
- `backgrounds.txt`
- `bard-spell-list.txt`
- `class-core-traits.txt`
- `class-expertise.txt`
- `class-level-tables.txt`
- `class-spell-replacement.txt`
- `class-starting-equipment.txt`
- `cleric-spell-list.txt`
- `domain-vocabularies.txt`
- `druid-spell-list.txt`
- `extra-attack-other-sources.txt`
- `feats.txt`
- `multiclass-entry-grants.txt`
- `multiclassing.txt`
- `paladin-spell-list.txt`
- `ranger-spell-list.txt`
- `sheet-math.txt`
- `skills-table.txt`
- `sorcerer-spell-list.txt`
- `species-descriptions.txt`
- `spell-descriptions.txt`
- `subclasses.txt`
- `unarmored-defense.txt`
- `warlock-spell-list.txt`
- `weapon-attack-cantrips.txt`
- `weapon-mastery-flat-classes.txt`
- `weapon-mastery-progression.txt`
- `weapons-table.txt`
- `wizard-spell-list.txt`

Each file above carries the notice verbatim. `docs/srd/SOURCE.md` identifies
the source pages and checksum for every extract.

### Rules modules and runtime notice

The following rules modules carry the full notice in their header comments:

- `src/rules/armor-srd.ts`
- `src/rules/background-definitions-srd.ts`
- `src/rules/class-equipment-srd.ts`
- `src/rules/class-traits-srd.ts`
- `src/rules/extra-attack-srd.ts`
- `src/rules/feats-srd.ts`
- `src/rules/multiclass-entry-srd.ts`
- `src/rules/origin-definitions-srd.ts`
- `src/rules/origins-srd.ts`
- `src/rules/sheet-srd.ts`
- `src/rules/skills.ts`
- `src/rules/spells-srd.ts`
- `src/rules/srd-subclass-content.ts`
- `src/rules/srd-subclasses.ts`
- `src/rules/unarmored-defense-srd.ts`
- `src/rules/weapons-srd.ts`

`src/rules/class-progression-lookup.ts` and `src/rules/spell-slots.ts` instead
carry header comments that point to `src/rules/srd-attribution.ts` and
`docs/srd/ATTRIBUTION.md`. `src/rules/srd-attribution.ts` holds the verbatim
runtime notice rendered by the legal page, reports, agent reference, and
printed sheet (`src/ui/screens/legal/legal.ts`,
`src/ui/screens/build-report/build-report.ts`,
`src/ui/screens/planner/agent-reference.ts`, and
`src/ui/screens/sheet/sheet-view.ts`).

### Seeded application content

`src/db/bootstrap.ts` installs the bundled SRD-derived catalog into each
application database. The seeded material consists of:

- class progressions and subclass definitions
  (`src/rules/class-progression-lookup.ts`,
  `src/rules/srd-subclass-content.ts`);
- class resources (`src/rules/class-resources-srd.ts`);
- weapons and weapon mastery (`src/rules/weapons-srd.ts`);
- class sheet facts, armour, and named features (`src/rules/sheet-srd.ts`);
- class starting equipment (`src/rules/class-equipment-srd.ts`);
- species and backgrounds, including their grant definitions
  (`src/rules/origins-srd.ts`, `src/rules/origin-definitions-srd.ts`, and
  `src/rules/background-definitions-srd.ts`);
- feats (`src/rules/feats-srd.ts`); and
- spells (`src/rules/spells-srd.ts`).

### SRD-derived material in homebrew documentation

The following homebrew documents currently reproduce the full notice:

- `docs/homebrew/README.md`
- `docs/homebrew/cc-by/2026-08-03-monk-bakeoff.md`
- `docs/homebrew/cc-by/2026-08-03-monk-barbed-court.md`
- `docs/homebrew/cc-by/2026-08-03-monk-hundred-knots.md`
- `docs/homebrew/cc-by/2026-08-03-monk-ten-selves.md`
- `docs/homebrew/cc-by/2026-08-03-monk-third-caster-pitches.md`
- `docs/homebrew/cc-by/2026-08-03-monk-waking-will.md`
- `docs/homebrew/cc-by/2026-08-03-oath-of-domination-subclass.md`
- `docs/homebrew/cc-by/2026-08-03-ranger-simple-subclass.md`
- `docs/homebrew/cc-by/2026-08-04-rogue-veteran-subclass.md`
- `docs/homebrew/cc-by/oath-of-domination-inputs.md`
- `docs/homebrew/cc-by/veteran-player.md`
- `docs/homebrew/cc-by/warrior-of-the-barbed-court-player.md`
- `docs/homebrew/subclass-guidelines/01-power-budget.md`
- `docs/homebrew/subclass-guidelines/02-cadence-and-anatomy.md`
- `docs/homebrew/subclass-guidelines/README.md`

## Project-original content (CC-BY-4.0)

`docs/homebrew/README.md` releases every document in `docs/homebrew/` under
the Creative Commons Attribution 4.0 International License. That
project-original corpus includes:

- the Veteran rogue subclass in
  `docs/homebrew/cc-by/2026-08-04-rogue-veteran-subclass.md`;
- the four monk subclass drafts in
  `docs/homebrew/cc-by/2026-08-03-monk-barbed-court.md`,
  `docs/homebrew/cc-by/2026-08-03-monk-ten-selves.md`,
  `docs/homebrew/cc-by/2026-08-03-monk-hundred-knots.md`, and
  `docs/homebrew/cc-by/2026-08-03-monk-waking-will.md`, with their supporting pitch
  and comparison documents in `docs/homebrew/`;
- the Oath of Domination paladin subclass in
  `docs/homebrew/cc-by/2026-08-03-oath-of-domination-subclass.md`;
- the Pursuer ranger subclass in
  `docs/homebrew/cc-by/2026-08-03-ranger-simple-subclass.md`; and
- the six-file design-guidelines corpus and its report in
  `docs/homebrew/subclass-guidelines/`, together with the operating lessons in
  `docs/homebrew/lessons.md`.

The project's own application code, including `src/`, `db/`, `scripts/`,
`tools/`, and `tests/`, is **all rights reserved pending the owner's choice**.
No code license is declared here.

## Waking Will concept ancestry

`docs/homebrew/cc-by/2026-08-03-monk-waking-will.md` makes the following disclosure:

> The 3.5 SRD Psionic Fist is this subclass's open-content concept ancestor; this adaptation uses none of its wording or subsystem mechanics.

This disclosure describes concept ancestry only; it does not claim reuse of
wording or mechanics from that work.

## Maintenance

Update this file at any merge that adds externally licensed or
license-relevant content.
