<!-- trimmed 2026-09-18 (D683): full codex log (1877260 bytes) replaced by the lane's final message; session id 01a0ae59-86c2-7cb1-8b2e-bbf96f72fd73; the full log is in the mirror history of commit 8889b450 -->

Implemented LAND-04. Only three test files changed; no fixtures or production files remain modified.

Files:

- [room-generator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/room-generator.test.ts)
- [ai-dm-arena.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-arena.test.ts)
- [ai-dm-legacy-invariance.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-legacy-invariance.test.ts)

## Task A — fog-key reconciliation

The temporary structural-diff witness reported exactly this path for every byte pin:

```text
3943001–3943012:              $.encounter.state.foggedCells
M576-E2-LEGACY-DEFAULT:       $.encounter.state.foggedCells
5117001–5117012:              $.encounter.state.foggedCells
6203001–6203003:              $.encounter.state.foggedCells
```

No other path differed. The test normalizer now deletes the obsolete key with a D635.48 comment, mirroring the V1 decoder. No fixture was edited.

Brutal generated-projection derivations, hashing canonical JSON plus newline:

| Seed | Old digest | New digest |
|---|---|---|
| 6203001 | `3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b` | `dee4cc931af96a3276308cdd37a7c169b3cb250d5fa24896b97356b868f4f0c2` |
| 6203002 | `cdb567192800c4dbea964fbabf03d88013d7d6402da8b391cf2f60e19e69a0c9` | `b190349ee0bfa1b40ef9f6d76fa46f15e985e9442a70295f4b23b604ecd99fd3` |
| 6203003 | `6c470c04fd6373f7fa999d5f0c66539c54eb71e6094e2b83a2ca972ab91720f8` | `f5db8767bbbef7376423bc0b1eeb307e39fc41d54fda879292fde90bcf0cf3db` |

The 6204 probe showed `d466NonRosterProjection` contains the state field for all ten seeds, not only replacement seeds 004/006/009. Every projection differed exclusively at `$.encounter.state.foggedCells`, so all ten asserted projection digests required normalization:

| Seed | Old | New |
|---|---|---|
| 6204001 | `a510aaa8e785c641bcf3455df6f7ce8fbf71b0f2ec978e3b5e6f2ac62f289a3f` | `b0c7344d10a0059c9b703b474c4b3a4e65c9d328d8c4f6edf8e55e62623fd5df` |
| 6204002 | `c26ea2b4bca6ed4f7afbf044a9853b410287e80dc9a4a4fc6f322083ea6eb501` | `b92cdc924d3a7b72da1cefb57a4bbb1821174b96f18b409bd88d2dda87905428` |
| 6204003 | `16bb7c43f6a2a1751928de993d50e5bd27e69b64c9ac8a4db9efbb72d94e2f66` | `1fa38b1c2f731d9b800013ccf71a065869d9156af876a07b1c2c5407012dac7a` |
| 6204004 | `9fb5c7812054c026eb9f8d070691fbf8af5925d5e6ce8123a33a3085af961990` | `c1ccfbc1ba22774cb77f22e1a1aa0b303314670120d8326f7f33e0048e14bd46` |
| 6204005 | `0ad33edb24bda5de199144bf9c6d6f1412e61d2915486a1364817cd47438259d` | `4648396c6dbcc96611120ad186f6079534485cd6af2f4fd26f475c8b1db7a9e6` |
| 6204006 | `d0138274a6f2b4cdf7996578b6408803ad723d808fb4b6d5487cc4b767dee880` | `407ee43e5d286f6649a1b6002daa8c2301df08fac106d2e58ff52b2343f3e9fc` |
| 6204007 | `bcd1545c7a397c86a37c7a672aab72c99689a94a9df812e5a39db830cbb7c326` | `343ef8a190c7f3559f5fa98d18228c60733c3385a6d3b70ccf64f22d9ba1515e` |
| 6204008 | `1bf591adce1bceac8ea3a8e44f9fcfed5b252266ceccfcc96991cb20670bc8b1` | `1b9c525fd3d36bc0ede5353c9626208b664e5604254eb3bcfc0ec47ba6e1ebed` |
| 6204009 | `a323c1eb80becabbae04661c815887440ddc89e02aa56a757cb776d5348d8255` | `b88590db462f9e1a238658a6b3ee17c75e58c6c5aefb97cc695926c18ed83304` |
| 6204010 | `2439eb3aa80907618d35f188429eb9ca07c56e3b0c35b1218e7732917e6b7ee9` | `5e7fbe28033ec0ad69ae49c5bdf576c26c2299c7658e5487c2e0324129ec076e` |

Reverse mutant:

```text
npx vitest run --configLoader runner tests/unit/vtt/room-generator.test.ts \
  --maxWorkers=1 -t 'pins frozen arena basis seed'
```

Adding `foggedCells: []` to each generated 3943 state produced exactly 12 failures and 54 skipped. Restored file hash: `bdfe02a47edc8cdac8560a951bed2ef848c6b88525b89cfeffa2b025b2b00312`.

## Task B — non-seam reconciliations

Arena:

- Four shared blind-row pins now expect `configuredSemanticBytes: 32_768`.
- The newly exposed chained assertion now bounds `actualSemanticBytes` by `32_768`; observed bytes were `10,399`.
- No other row field changed.

Legacy invariance D569 derivation:

```text
Structural difference: $.foggedCells only
Old starting-room digest:
34287ad8ff3dad719ee984f2f5ae1690cf71d8760bcb842dbeca08bccdaa6263

New starting-room digest:
4757f909c6fe5c9dec585232c8d8b9aead3b1b6f9d9376993682fc8a92b66be9
```

The test now reconstructs both states, asserts that exact structural difference, hashes both independently, and approves only `row[0].startingRoomDigest`. Existing schema-4 engine-state derivations remain unchanged.

D569-v5 remains intentionally untouched:

```text
Invalid D569 experiment manifest: second_family_first_regeneration
```

It fails during file initialization with zero tests collected because the frozen second family awaits the owner.

## Task C — investigation

Brutal first-family violations:

```text
6203001 brutal_productivity
6203002 brutal_productivity
6203003 brutal_productivity
6203004 brutal_productivity
6203005 []
6203006 brutal_productivity
6203007 []
6203008 brutal_productivity
6203009 brutal_productivity
6203010 brutal_productivity
```

Each violation message is `every brutal monster must have a productive first-turn offer`.

Composite scout:

- Scout: `(13,3)`.
- Fighter `(1,2)`: aggregate `half / blocksSight=true`.
  - Two rays are `total/true`.
  - Rays to `(1,3)` and `(2,3)` are `none/true` along seam flanks `(7,2)/(7,3)`.
- Cleric `(2,4)`: aggregate `half / true`.
  - Rays to `(2,4)` and `(3,4)` are `none/true` along `(7,3)/(7,4)`.
  - Remaining two rays are `total/true`.
- Wizard `(1,6)`: current-origin trace is `total/true`; all four selected rays are physical Total Cover.
- Offered labels are exactly `Dodge`, `End Turn`.

Room-8 monster-1:

- Actor `(22,1)`; PCs at fighter `(1,2)`, cleric `(2,4)`, wizard `(1,6)`.
- Fighter trace: `half/true`; rays to `(1,2)` and `(2,2)` are `none/true` along `(12,1)/(12,2)`, with two remaining `total/true` rays.
- Cleric and wizard traces are `total/true`.
- Offered labels are `Dodge`, `End Turn`; `basic_advance` selects zero-foot Dodge.
- Production test additionally showed monsters 1/2/4 change expected Dash to zero-foot Dodge; monster 5 still Dashes.

Speculative planning, seed 5117001:

- Priest m1 `(15,1)` and monster m2 `(14,1)`.
- PCs: fighter `(1,2)`, cleric `(2,4)`, wizard `(1,6)`.
- For both monsters, fighter is `half/true`; the two row-2 rays are `none/true` along seam `(8,1)/(8,2)`, while the other two are `total/true`.
- Cleric and wizard are `total/true`.
- m1 retains Dash/Divine Aid and defensive options; m2 has only Dodge/End Turn.
- `scenarioMenu` is empty.

Causal probe:

```text
Production form: 3 failed, 36 skipped
Seam disabled only: 3 passed, 36 skipped
```

Therefore all three behavior failures are consequences of the D635 seam rule. LAND-01 is functioning correctly by refusing the resulting sight-blocked offers.

### Three-way family counts

An “attack/save offer” is one resolved offered option containing at least one attack or saving-throw component; multiattack counts once. “Zero attack” means a living monster has no resolved offered option containing an attack.

| Family | Monsters | As-is offers | As-is zero attack | Seam off offers | Seam off zero | Seam + LOS refusal off offers | Both off zero |
|---|---:|---:|---:|---:|---:|---:|---:|
| hard 5117001–013 | 75 | 142 | 35 | 286 | 9 | 286 | 9 |
| brutal | 44 | 57 | 34 | 111 | 31 | 111 | 31 |
| brutal-b | 42 | 15 | 41 | 54 | 35 | 54 | 35 |
| brutal-2 | 44 | 58 | 36 | 96 | 34 | 96 | 34 |

The hard+brutal+brutal-b totals reconcile with the earlier measurements: 214 as-is and 451 with the seam disabled. Disabling LAND-01 after disabling the seam changes no count.

Production hashes before and after all probes:

```text
src/combat/cover.ts
c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662

src/vtt/engine-query-port.ts
1a552fba7ac01bdf45ec3c4467acbfa71b9f412242c55ed0e41ddab587b70a0a
```

## Verification

- `npx vitest run --configLoader runner tests/unit/vtt/room-generator.test.ts --maxWorkers=1`
  - 58 passed, exactly eight expected productivity reds:
    - `generates brutal seed 6203001 ... productive monsters`
    - `6203002`
    - `6203003`
    - `6203004`
    - `6203006`
    - `6203008`
    - `6203009`
    - `6203010`
- `npx vitest run --configLoader runner tests/unit/tools/ai-dm-arena.test.ts --maxWorkers=1`
  - 58/58 passed in 289.75s.
- `npx vitest run --configLoader runner tests/unit/tools/ai-dm-legacy-invariance.test.ts --maxWorkers=1`
  - 10/10 passed in 48.78s.
- `npx tsc -p tsconfig.app.json --noEmit`
  - Exit 0, 14.18s.
- `npx tsc -p tsconfig.node.json --noEmit`
  - Exit 0, 27.94s.
- `git diff --check`
  - Clean.
- Added-line width check:
  - No added line over 120 columns.
- `git status --short`:
  - `M tests/unit/tools/ai-dm-arena.test.ts`
  - `M tests/unit/tools/ai-dm-legacy-invariance.test.ts`
  - `M tests/unit/vtt/room-generator.test.ts`
- `git diff --name-only -- tests/fixtures`
  - Empty.

LAND-04 DONE
