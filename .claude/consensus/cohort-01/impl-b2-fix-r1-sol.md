
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR] (network access enabled)
reasoning effort: high
reasoning summaries: none
session id: 01a0b245-5a53-7990-9cf5-5abf61f029d7
--------
user
RULES (binding, restated): You are the IMPLEMENTER (gpt-5.6-sol, high, RESUMED — COHORT-01 Batch 2). Worktree /home/vagrant/PhpstormProjects/dnd-wt-cohort-01 (claude/cohort-01 at 8284a91c = your Batch 2, committed by the supervisor; clean). Same rules as your brief: workspace-write in that worktree only; no git writes; no .claude/** or docs/**; no claude / other agents / consensus skills; no Playwright / full vitest / build; never regenerate an expectation from our own output; V-freeze before and after; the frozen plan sha256 4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69 (403 lines) binds.

ASTRA B2 REVIEW = REJECT (0 P1, 1 P2). B2-F1 (P2), tests/unit/vtt/room-generator.test.ts:~575: the 6203 retirement removed the WHOLE test that called brutalRoomMembershipViolations(brutal) for 6203001–6203010 — that assertion also enforced difficulty, the scaled budget / 90–100% spend, an implemented caster and the terrain requirements, not only productivity; the retained byte/digest tests cover only 6203001–6203003. Astra's mutant: adding 1 to seed 6203010's brutal budget in memory leaves the suite 56/56 green; with the former static assertion restored and ONLY brutal_productivity filtered, the unmutated suite passes and the mutant fails with brutal_budget. FIX: restore the ten-seed static membership assertion for 6203001–6203010, filtering out ONLY the `brutal_productivity` violation kind (as B1 does for 6207), keep the rationale comment, keep the per-monster productivity loop removed. Add astra's mutant as your own witness run (budget +1 on 6203010 → red with brutal_budget; restore). Everything else in B2 was accepted (6206: only the productivity loop removed; the 30 v2 declarations through declareTestInputs; PLAN-F6 predicate; the three mutants).

VERIFICATION: tsc app/node; git diff --check; no line > 120; room-generator suite (report Tests count), brutal-b 47/47, second-family 50/50, the v2 suite still 30 ENOENT reds; V-freeze 0; git status --short = tests/unit/vtt/room-generator.test.ts only. OUTPUT: report, then "COHORT-01 B2 FIX R1 DONE".

codex
I’ll verify the resumed commit, frozen plan, clean worktree, and protected-byte baseline first. Then I’ll restore only the ten-seed static membership assertion, demonstrate Astra’s `6203010` budget mutant, restore it, and run the requested gates.
exec
/bin/bash -lc "git rev-parse HEAD
git status --short
sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md
wc -l .tmp-plans/2026-09-17-cohort-01-plan.md
git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2
printf 'V_FREEZE_BEFORE_STATUS=%s\\n' \""'$?"' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
8284a91c9b5cae6faf58a246aff2ce4355ae5bf0
4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69  .tmp-plans/2026-09-17-cohort-01-plan.md
403 .tmp-plans/2026-09-17-cohort-01-plan.md
V_FREEZE_BEFORE_STATUS=0

codex
The resumed state is exact: HEAD `8284a91c…`, clean status, plan hash/length match, and pre-fix V-freeze is exit 0. I’m locating the committed retirement block now and will restore the static contract without restoring the per-monster productivity loop.
exec
/bin/bash -lc "sed -n '1,90p' tests/unit/vtt/room-generator.test.ts
sed -n '540,610p' tests/unit/vtt/room-generator.test.ts
rg -n \"BRUTAL_PRODUCTIVITY|brutalRoomMembershipViolations|D635/D642/D643\" tests/unit/vtt/room-generator.test.ts tests/unit/tools/d569-second-family-manifest.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { BUNDLED_MONSTER_ROSTER, STARTER_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { sha256 } from '../../../src/crypto/sha256';
import { creatureSizes, type KnownCreatureSize } from '../../../src/domain/enums';
import {
  D466_GENERATED_ROOM_OVERRIDES,
  d466CreatureReplacement,
  d466ReplacementStatblock,
} from '../../../src/vtt/d466-room-overrides';
import {
  generateRoom,
  heldoutMaximizingMonsterRosters,
  HELDOUT_STARTER_MONSTER_FAMILIES,
  ROOM_GRID_DIMENSIONS,
  type GeneratedRoom,
} from '../../../src/vtt/room-generator';
import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
import { declareTestInputs } from '../../helpers/test-inputs';

const BASIS_SEEDS = [
  3_943_001,
  3_943_002,
  3_943_003,
  3_943_004,
  3_943_005,
  3_943_006,
  3_943_007,
  3_943_008,
  3_943_009,
  3_943_010,
  3_943_011,
  3_943_012,
] as const;

const HARD_BASIS_SEEDS = [
  5_117_001,
  5_117_002,
  5_117_003,
  5_117_004,
  5_117_005,
  5_117_006,
  5_117_007,
  5_117_008,
  5_117_009,
  5_117_010,
  5_117_011,
  5_117_012,
] as const;

const BRUTAL_BASIS_SEEDS = [6_203_001, 6_203_002, 6_203_003] as const;
const BRUTAL_BASIS_GENERATED_DIGESTS = {
  // D635.48: each old projection differs only by the removed state.foggedCells: [] key.
  // 6203001 old 3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b
  6_203_001: 'dee4cc931af96a3276308cdd37a7c169b3cb250d5fa24896b97356b868f4f0c2',
  // 6203002 old cdb567192800c4dbea964fbabf03d88013d7d6402da8b391cf2f60e19e69a0c9
  6_203_002: 'b190349ee0bfa1b40ef9f6d76fa46f15e985e9442a70295f4b23b604ecd99fd3',
  // 6203003 old 6c470c04fd6373f7fa999d5f0c66539c54eb71e6094e2b83a2ca972ab91720f8
  6_203_003: 'f5db8767bbbef7376423bc0b1eeb307e39fc41d54fda879292fde90bcf0cf3db',
} as const;
const BRUTAL_BASIS_FIXTURE_DIGESTS = {
  6_203_001: '3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b',
  6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
  6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
} as const;
const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
  6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
  6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
  6_204_003: '105b5a7ff69ff572606a494fc336b29badb16f5c08438ec83fe0f1b7cf264e6f',
  6_204_004: 'e3b822d18589cfabdd6acc579daec22325540661869850ba55c583970725fd75',
  6_204_005: '3af3cf9a27216bc25dad9586696d47f587bec1e7ed8879569c6052e892693e72',
  6_204_006: 'be0fcd2d2cbf0415fc6b07189132ba665e30973b86a3847e43b427c11a238b4f',
  6_204_007: '56665e115694a30c5ff7da200e10394ae55093e5b85e03252bc2f36717cc5ba4',
  6_204_008: 'ae387c2541e566bdf565334837d2729eb9c1a65303fe0f412eed3288fd86d306',
  6_204_009: '04fbc7fd4cd029c63d0d936539ab53aca3d50c80206764aede55fbc0ba72a88e',
  6_204_010: '2768168a0da1fa28d35e86febb92a6035f892fbe5a1f703c89c13fe6ace3339b',
} as const;

const D466_6204_NON_ROSTER_DIGESTS = {
  // D635.48: every old projection differs only by the removed state.foggedCells: [] key.
  // 6204001 old a510aaa8e785c641bcf3455df6f7ce8fbf71b0f2ec978e3b5e6f2ac62f289a3f
  6_204_001: 'b0c7344d10a0059c9b703b474c4b3a4e65c9d328d8c4f6edf8e55e62623fd5df',
  // 6204002 old c26ea2b4bca6ed4f7afbf044a9853b410287e80dc9a4a4fc6f322083ea6eb501
  6_204_002: 'b92cdc924d3a7b72da1cefb57a4bbb1821174b96f18b409bd88d2dda87905428',
  // 6204003 old 16bb7c43f6a2a1751928de993d50e5bd27e69b64c9ac8a4db9efbb72d94e2f66
  6_204_003: '1fa38b1c2f731d9b800013ccf71a065869d9156af876a07b1c2c5407012dac7a',
        ).toBe(D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS[typedSeed]);
        continue;
      }

      const replacement = d466CreatureReplacement(override.original);
      const replacementEntries = room.spec.monsterRoster.filter(
        (entry) => entry.statblockId === replacement.replacement,
      );
      expect(replacementEntries.length, `seed ${String(seed)} did not receive its replacement`).toBeGreaterThan(0);
      expect(room.spec.monsterRoster.some((entry) => entry.statblockId === replacement.original)).toBe(false);
      for (const entry of replacementEntries) {
        expect(entry).toMatchObject({
          challengeRating: replacement.challengeRating,
          challengeEighths: replacement.crEighths,
        });
        const combatant = room.encounter.state.combatants.find(
          (candidate) => candidate.profile.id === entry.combatantId,
        );
        expect(combatant?.profile).toEqual(monsterCombatantProfile(
          d466ReplacementStatblock(replacement),
          { combatantId: entry.combatantId, tokenId: entry.tokenId },
        ));
      }
      const restoredRoster = room.spec.monsterRoster.map((entry) =>
        entry.statblockId !== replacement.replacement ? entry : {
          ...entry,
          statblockId: replacement.original,
        });
      expect(
        sha256(canonicalJson(restoredRoster)),
        `seed ${String(seed)} changed sampled roster data beyond the typed id replacement`,
      ).toBe(D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS[typedSeed]);
    }
  });

  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
  // own the live productivity contract under the sealed-wall geometry.

  it.each([
    [3, 900],
    [4, 1_500],
    [5, 3_000],
    [6, 4_000],
  ] as const)('builds four full level-matched PCs at level %s', (level, targetXp) => {
    const party = heldoutParty(level);
    const room = generateRoom(7_850_001 + level, {
      initiativeProfile: 'derived_v1',
      heldoutOrdinary: {
        protocol: 'heldout-development-v1',
        party,
        partyLevel: level,
        targetXp,
      },
    });
    const players = room.encounter.state.combatants.filter((subject) =>
      subject.profile.kind === 'player_character');

    expect(players).toHaveLength(4);
    expect(players.map((subject) => subject.profile.id)).toEqual(
      party.members.map((member) => member.profile.id),
    );
    expect(players.every((subject) =>
      subject.life === 'living' && subject.hitPoints === subject.profile.rules.hitPointMaximum &&
      subject.deathSaves === null)).toBe(true);
    expect(room.spec.partyState.every((seat) =>
      'hitPointFraction' in seat && seat.hitPointFraction === 1 && seat.concentrating === false &&
      seat.spellSlots.every((slot) => slot.remaining === slot.maximum))).toBe(true);
    expect(room.spec.heldoutOrdinary).toMatchObject({
      protocol: 'heldout-development-v1',
      partyLevel: level,
      targetXp,
tests/unit/tools/d569-second-family-manifest.test.ts:8:  brutalRoomMembershipViolations,
tests/unit/tools/d569-second-family-manifest.test.ts:147:      // D635/D642/D643: 6207 keeps historical integrity/static checks; 6211 v2 owns live productivity.
tests/unit/tools/d569-second-family-manifest.test.ts:148:      expect(brutalRoomMembershipViolations(frozen)
tests/unit/tools/d569-second-family-manifest.test.ts:185:    expect(brutalRoomMembershipViolations(broken).map((violation) => violation.code))
tests/unit/vtt/room-generator.test.ts:575:  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/room-generator.test.ts
diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

codex
The fix is in place: the 6203 ten-seed test now retains difficulty, budget/spend, caster, and terrain validation while filtering only `brutal_productivity`. The per-monster productivity loop remains retired. I’m first proving the unmutated suite count, then I’ll apply the temporary `6203010` budget `+1` mutation.
exec
/bin/bash -lc 'npx vitest run tests/unit/vtt/room-generator.test.ts --maxWorkers=1 --no-file-parallelism --configLoader runner' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 6178ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json

 Test Files  1 passed (1)
      Tests  66 passed (66)
   Start at  23:07:59
   Duration  5.84s (transform 1.38s, setup 0ms, import 2.00s, tests 2.21s, environment 0ms)


diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/room-generator.test.ts
diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..93fc250bf9f266a35ad456eb33dfb79eb7276a62
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,25 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      const candidate = seed === 6_203_010
+        ? {
+            ...brutal,
+            spec: {
+              ...brutal.spec,
+              challengeBudgetEighths: brutal.spec.challengeBudgetEighths + 1,
+            },
+          }
+        : brutal;
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(candidate)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..93fc250bf9f266a35ad456eb33dfb79eb7276a62
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,25 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      const candidate = seed === 6_203_010
+        ? {
+            ...brutal,
+            spec: {
+              ...brutal.spec,
+              challengeBudgetEighths: brutal.spec.challengeBudgetEighths + 1,
+            },
+          }
+        : brutal;
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(candidate)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

exec
/bin/bash -lc "npx vitest run tests/unit/vtt/room-generator.test.ts -t 'retains brutal seed' --maxWorkers=1 --no-file-parallelism --configLoader runner" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 5198ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json
 ❯ tests/unit/vtt/room-generator.test.ts (66 tests | 1 failed | 56 skipped) 1399ms
     × retains brutal seed 6203010 difficulty, budget, caster, and terrain membership 95ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/room-generator.test.ts > seeded room generator > retains brutal seed 6203010 difficulty, budget, caster, and terrain membership
AssertionError: expected [ { code: 'brutal_budget', …(1) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "code": "brutal_budget",
+     "message": "brutal budget must be scaled from hard and spend 90-100 percent",
+   },
+ ]

 ❯ tests/unit/vtt/room-generator.test.ts:598:75
    596|       // own the live productivity contract under the sealed-wall geom…
    597|       expect(brutalRoomMembershipViolations(candidate)
    598|         .filter((violation) => violation.code !== 'brutal_productivity…
       |                                                                           ^
    599|     },
    600|   );

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 9 passed | 56 skipped (66)
   Start at  23:08:18
   Duration  4.86s (transform 1.36s, setup 0ms, import 1.96s, tests 1.40s, environment 0ms)


diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..93fc250bf9f266a35ad456eb33dfb79eb7276a62
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,25 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      const candidate = seed === 6_203_010
+        ? {
+            ...brutal,
+            spec: {
+              ...brutal.spec,
+              challengeBudgetEighths: brutal.spec.challengeBudgetEighths + 1,
+            },
+          }
+        : brutal;
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(candidate)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/room-generator.test.ts
diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

codex
Astra’s mutant is killed exactly as required: the targeted run produced `1 failed / 9 passed / 56 skipped`, and seed `6203010` failed with the sole violation code `brutal_budget`. The temporary mutation is restored. I’m now rerunning all four requested suites from the restored tree.
exec
/bin/bash -lc 'npx vitest run tests/unit/vtt/room-generator.test.ts --maxWorkers=1 --no-file-parallelism --configLoader runner' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 5953ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json

 Test Files  1 passed (1)
      Tests  66 passed (66)
   Start at  23:08:39
   Duration  5.61s (transform 1.28s, setup 0ms, import 1.85s, tests 2.21s, environment 0ms)


diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

exec
/bin/bash -lc 'npx vitest run tests/unit/tools/d569-second-family-manifest.test.ts --maxWorkers=1 --no-file-parallelism --configLoader runner' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 7400ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json

 Test Files  1 passed (1)
      Tests  50 passed (50)
   Start at  23:08:51
   Duration  7.06s (transform 1.30s, setup 0ms, import 1.88s, tests 3.65s, environment 0ms)


diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

exec
/bin/bash -lc 'npx vitest run tests/unit/vtt/arena-basis-brutal-b.test.ts --maxWorkers=1 --no-file-parallelism --configLoader runner' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 27907ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json

 Test Files  1 passed (1)
      Tests  47 passed (47)
   Start at  23:09:02
   Duration  27.56s (transform 1.44s, setup 0ms, import 2.07s, tests 23.97s, environment 0ms)


diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

exec
/bin/bash -lc 'npx vitest run tests/unit/vtt/arena-basis-brutal-v2.test.ts --maxWorkers=1 --no-file-parallelism --configLoader runner' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 3915ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts (34 tests | 30 failed) 30ms
     × 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 2ms
     × 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms

⎯⎯⎯⎯⎯⎯ Failed Tests 30 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209001.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209002.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209003.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209004.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209005.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209006.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209007.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209008.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209009.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209010.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[21/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[23/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[24/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[25/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[27/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[28/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[29/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[30/30]⎯


 Test Files  1 failed (1)
      Tests  30 failed | 4 passed (34)
   Start at  23:09:34
   Duration  3.56s (transform 1.30s, setup 0ms, import 1.85s, tests 30ms, environment 0ms)


diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

codex
The restored suite results are exact: room-generator `66/66`, brutal-b `47/47`, second-family `50/50`, and v2 `30 failed / 4 passed`, all 30 still `ENOENT` for missing cohorts. I’m completing the two compiler gates and final single-file/freeze checks now.
exec
/bin/bash -lc 'npx tsc -p tsconfig.app.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
exec
/bin/bash -lc 'npx tsc -p tsconfig.node.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 15012ms:
 succeeded in 29088ms:
diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

exec
/bin/bash -lc 'set +e
git diff --check
diff_status=$?
printf '"'GIT_DIFF_CHECK_STATUS=%s\\n' \""'$diff_status"
awk '"'length("'$0) > 120 { print FILENAME ":" FNR ":" length($0); count += 1 } END { printf "OVERLONG_LINES=%d'"\\n\", count + 0 }' tests/unit/vtt/room-generator.test.ts
printf '%s\\n' 'STATUS_BEGIN'
git status --short
printf '%s\\n' 'STATUS_END'
git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2
freeze_status="'$?
printf '"'V_FREEZE_AFTER_STATUS=%s\\n' \""'$freeze_status"
printf '"'%s\\n' 'DIFF_BEGIN'
git diff -- tests/unit/vtt/room-generator.test.ts
printf '%s\\n' 'DIFF_END'
exit 0" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
GIT_DIFF_CHECK_STATUS=0
OVERLONG_LINES=0
STATUS_BEGIN
 M tests/unit/vtt/room-generator.test.ts
STATUS_END
V_FREEZE_AFTER_STATUS=0
DIFF_BEGIN
diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7..60c06649 100644
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@ import {
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@ const BRUTAL_BASIS_FIXTURE_DIGESTS = {
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@ describe('seeded room generator', () => {
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],
DIFF_END

diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

codex
Restored the 6203 static membership contract in [room-generator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/room-generator.test.ts):

- All ten seeds `6203001–6203010` validate difficulty, scaled budget/spend, implemented caster, and terrain.
- Only `brutal_productivity` is filtered.
- The per-monster productivity loop remains retired.
- D635/D642/D643 rationale remains.

Verification:

- Room-generator: `66/66` passed.
- Budget `+1` mutant on `6203010`: `1 failed / 9 passed`; failure was exactly `brutal_budget`.
- Brutal-b: `47/47` passed.
- Second-family: `50/50` passed.
- V2 suite: `30 failed / 4 passed`; all failures are expected missing-fixture `ENOENT` reds.
- TypeScript app/node: exit `0/0`.
- `git diff --check`: exit `0`.
- Lines over 120: `0`.
- V-freeze before/after: exit `0/0`.
- `git status --short`: only `tests/unit/vtt/room-generator.test.ts`.

COHORT-01 B2 FIX R1 DONE
diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index 267bbde7bbc0b4214655d27bd3dc35976f8b3f47..60c06649443142003beaa095d9615c6e82ede36c
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,7 +18,10 @@
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
+import {
+  brutalRoomMembershipViolations,
+  hardRoomMembershipViolations,
+} from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
@@ -67,6 +70,10 @@
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
+const BRUTAL_STATIC_MEMBERSHIP_SEEDS = [
+  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
+  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
+] as const;
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -572,8 +579,16 @@
     }
   });
 
-  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
-  // own the live productivity contract under the sealed-wall geometry.
+  it.each(BRUTAL_STATIC_MEMBERSHIP_SEEDS)(
+    'retains brutal seed %s difficulty, budget, caster, and terrain membership',
+    (seed) => {
+      const brutal = generateRoom(seed, { difficulty: 'brutal' });
+      // D635/D642/D643: 6203 keeps historical static membership; 6209/6210/6211
+      // own the live productivity contract under the sealed-wall geometry.
+      expect(brutalRoomMembershipViolations(brutal)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+    },
+  );
 
   it.each([
     [3, 900],

tokens used
233,931
Restored the 6203 static membership contract in [room-generator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/room-generator.test.ts):

- All ten seeds `6203001–6203010` validate difficulty, scaled budget/spend, implemented caster, and terrain.
- Only `brutal_productivity` is filtered.
- The per-monster productivity loop remains retired.
- D635/D642/D643 rationale remains.

Verification:

- Room-generator: `66/66` passed.
- Budget `+1` mutant on `6203010`: `1 failed / 9 passed`; failure was exactly `brutal_budget`.
- Brutal-b: `47/47` passed.
- Second-family: `50/50` passed.
- V2 suite: `30 failed / 4 passed`; all failures are expected missing-fixture `ENOENT` reds.
- TypeScript app/node: exit `0/0`.
- `git diff --check`: exit `0`.
- Lines over 120: `0`.
- V-freeze before/after: exit `0/0`.
- `git status --short`: only `tests/unit/vtt/room-generator.test.ts`.

COHORT-01 B2 FIX R1 DONE
