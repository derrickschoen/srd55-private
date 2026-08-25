# D365 four-room dungeon — structural difficulty record

This record counts one listed monster as one ordinary hostile turn opportunity
against five ordinary PC turns. It is a structural ratio, not an XP-budget
claim. The values are derived from the live manifests in
`src/vtt/d365-sample-dungeon.ts` and pinned against their roster lengths by the
D385 survival tests.

| Room | Final composition | Hostile / party opportunities | Recorded ratio | Hazards and retained mechanics |
|---|---|---:|---:|---|
| Briar Gate Pack | 2 Goblin Warriors, 2 Wolves | 4 / 5 | **0.8x** | Blocked center cell; Pack Tactics and distributed targets. |
| Webbed Bear Den | Cave Bear, Ambush Weaver | 2 / 5 | **0.4x** | Two blocked cells; grapple/squeeze, Web, venom, Spider Climb. |
| Ridgewing Gallery | Scout, Ridgewing Hunter, Storm Raptor | 3 / 5 | **0.6x** | Two blocked cells; ranged fire, flight, charge/raking pass, Prone riders. |
| Ironweb Crown | Ironweb Weaver | 1 / 5 | **0.2x** | Two blocked cells; Web/Restrained control, venom, Spider Climb. |

The D382 detune removed one Scout from Ridgewing Gallery. D385 adds a fifth PC,
so its unchanged three-hostile roster now measures 0.6x rather than 0.75x, and
replaced the former Dreadweb Weaver plus two Bugbear Stalkers (3 / 4, 0.75x)
with one Ironweb Weaver (now 1 / 5, 0.2x). The leader/control identity remains a
large arachnid with Web and venom rather than a mechanically unrelated weak
creature. Goblin Warrior, Wolf, and Scout are anchored at
`docs/srd/full/srd-5.2.1.txt:18985-19018`,
`docs/srd/full/srd-5.2.1.txt:24033-24059`, and
`docs/srd/full/srd-5.2.1.txt:21130-21164`. The original beast statblocks and
their SRD balance comparables are recorded in
`src/combat/statblocks/homebrew-beast-families.ts`.
