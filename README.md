# D&D character builder (pre-alpha)

A local-first web app for building and leveling D&D characters against the
SRD 5.2.1 ruleset, with the rules engine expressed in the type system so a
wrong program fails to compile rather than producing a plausible wrong
number. Pre-alpha: expect breaking changes; export backups.

## Licensing

Three licenses cover this repository, split by what each file is:

- **Code** (everything that is software: `src/`, `db/`, `scripts/`,
  `tools/`, `tests/`, build configuration) is licensed under the
  [MIT License](LICENSE).
- **Game content** — material from the System Reference Document 5.2.1
  (embedded as catalog data and rules text) and this project's own
  homebrew documents in `docs/homebrew/cc-by/` — is licensed under the
  Creative Commons Attribution 4.0 International License; the required
  attribution statement is in [NOTICE.md](NOTICE.md).
- **OGL material** — `docs/homebrew/ogl/` holds Open Game License 1.0a
  source material and derivations; the license text and its Section 15
  chain live in that folder, and its text never crosses into the CC-BY
  tree.

[NOTICE.md](NOTICE.md) carries the required SRD attribution statement, the
CC-BY file lists, and per-source provenance. It is updated at any merge
that adds license-relevant content.

Issues are welcome; this repository does not currently accept pull
requests.
