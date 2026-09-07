# How to read the combat board

## Grid, scale, and coordinate gutter
The board is a top-down square grid. Its normal rendered tile pitch is 128 pixels (compact captures can use 64), but either size represents one five-foot cell. The gutter labels the top and bottom with columns and both sides with rows. Labels use the zero-based `column,row` convention: the top-left cell is `0,0`, columns increase to the right, and rows increase downward. Diagonal neighbors count as adjacent on this grid. Coordinates help you read identity and distance; a destination or area anchor may be named with a zero-based `column,row` gutter label, while a relative destination follows the shortest legal path and breaks ties by lexical `column,row`.

## Creature identities, sides, rings, and footprints
Each creature bust has a numbered colored badge; the same badge appears in the roster, so use it to distinguish repeated names. A creature's anchor is the cell holding its badge. <!-- board-feature:side-party --> A cool-blue floor plate and PARTY roster word identify a player character. <!-- board-feature:side-foe --> A warm-red floor plate and FOE roster word identify a monster. The renderer has no third neutral creature plate: a non-player combatant is shown as FOE, so do not infer moral allegiance beyond the rendered side. A colored bust ring reinforces the anchored token's identity, especially when badges stack. Large, Huge, and Gargantuan creatures span two-by-two, three-by-three, and four-by-four footprints; read every covered cell as occupied. A hidden ring scales around the full shown footprint.

## Hit-point bars, life glyphs, and corpses
Every living token has a bottom HP bar and the roster repeats only its band. <!-- board-feature:hp-uninjured --> Green and **UNINJURED** mean above the Bloodied threshold. <!-- board-feature:hp-bloodied --> Amber and **BLOODIED** mean at or below half. <!-- board-feature:hp-near-death --> Red and **NEAR DEATH** mean the bounded low-health band. <!-- board-feature:hp-unknown --> Gray or empty and **UNKNOWN** mean the board withholds the band. These are classes, never exact HP fractions or totals. The small top-right life glyph is filled and heart-like for living, hollow for dying, boxed or shield-like for stable, and skull-like for dead. A dead creature additionally becomes a desaturated prone corpse silhouette; it still marks occupied board history but must not be planned as a living actor.

## Hidden creatures
<!-- board-feature:hidden --> A creature hidden from players has a dashed ring or plate around its bust. In full-glyph boards, an eye crossed by a slash sits on the ring's left rim and HIDDEN appears in the roster row. This is an explicit projected state; ordinary cover, darkness, or obscurement alone is not the hidden mark.

## Blocked and difficult cells
<!-- board-feature:blocked --> A blocked cell is filled by a large cross-braced stone pile; full-glyph mode also adds an X in a square at bottom-left. It cannot be treated as open movement space. <!-- board-feature:difficult --> Difficult Terrain is one cell-local emblem of three inset opaque pale-ochre zigzag ridges with a dark outline. It costs extra movement but is not itself blocked.

## Obscurement and fog
<!-- board-feature:obscured --> Obscured terrain is a cool cyan veil of three closed inset diamonds forming a lattice plus a cyan-waves glyph just left of bottom-right in full mode. **Obscured is not fog** and is separate from light level. <!-- board-feature:fog --> Fog is a warm-gray veil of diagonal hatching with a cloud glyph at bottom-right in full mode. A cell can show both facts.

## Bright, dim, and dark cells
<!-- board-feature:bright --> Bright light is either a pale warm floor treatment or a small sun at top-left. <!-- board-feature:dim --> Dim light is either a fainter warm floor treatment or a crescent moon at top-left. <!-- board-feature:darkness --> Darkness is either a dark veil or a filled dark circle at top-left. <!-- board-feature:light-default --> In light-glyph modes, no top-left glyph means the room-default light named by the legend's “No glyph =” row; an unmarked cell is not automatically bright. Light-source world art is separate from the cell's effective light mark.

## Doors and the door rail
<!-- board-feature:door-closed --> A closed door has a solid slab crossed by a dark bar in the cell's top-right and blocks according to its rendered state. <!-- board-feature:door-open --> An open door has a frame with an open gap and swing arc at top-right. Doors appear only where a door world object exists, not wherever decorative wall art resembles one. In a snapshot, the rail below the legend repeats each door glyph, says DOOR OPEN or DOOR CLOSED, and prints its cell.

## World objects and the object rail
<!-- board-feature:object --> A non-door, non-light-source object in full mode carries a crate-shaped OBJECT sigil; its art and footprint remain the primary depiction. Object kinds can be barriers, cover, hazards, light sources, summoned terrain, generic objects, or doors, but appearance and the rail name—not the kind alone—tell you what is present. <!-- board-feature:light-source --> A light source has its own warm legend swatch and may illuminate cells, yet the effective light marks are the final guide to visibility. Snapshot rail tags use the crate sigil for every non-door object, including a light source, and repeat the full name and anchor cell. World art is lit from upper-left with a lower-right contact shadow that grounds it in its owning cell.

## Persistent areas and other outlined regions
Persistent spell or feature areas are drawn as outlined cell overlays and identify their owner and shape; movement regions use a separate outlined treatment. Treat an outline as an active region over the underlying floor, not as a wall, fog, or creature. Overlapping cell marks remain independently meaningful.

## Roster box and legend panel
The roster box under the board maps badge to full creature name, anchor cell, PARTY or FOE side, HP-band word, and HIDDEN when applicable. The legend panel is the source of truth for the marks actually used on that board: it presents side plates, hidden, terrain, light, fog, blocking, doors, objects, light sources, and all HP bands. A mark absent from a particular legend can simply be absent from that board.

## What the board does not draw
The board does not reveal exact HP totals, hidden facts beyond explicit projected marks, executable engine choices, movement paths to select, die expressions, target numbers, damage amounts, or state-changing commands. It is evidence for relative tactical intent, while the rules engine decides legal execution.

# Relative round-intent protocol

1. Read the whole board, roster, legend, initiative order, and supplied creature rules.
2. Form one shared objective for the monster side.
3. Include every required creature exactly once, using visible name and badge.
4. State one action intent and visible target when relevant. A destination may be a gutter label or `hold`, `adjacent_to`, `toward`, `away_from`, `near`, or `behind` a named visible entity; an omitted destination means `hold`. An area may use a gutter label or be centered on a named entity, optionally followed by one of eight directions: north, northeast, east, southeast, south, southwest, west, or northwest. Apart from a permitted gutter label, never output numbers, dice results or expressions, DCs, damage amounts, explicit paths, or commands.
5. Give a brief tactical reason. Do not restate hidden mechanics or invent state.

An omitted movement intent means hold position. The rules engine determines destinations, legality, tests, and outcomes after the intent is expressed.
