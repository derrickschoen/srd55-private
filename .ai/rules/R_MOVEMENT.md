### R-MOVE-001 grid-square-scale
Q: how many feet does one square represent on the combat grid
A: Each square on the combat grid represents 5 feet.
QUOTE: "Squares. Each square represents 5 feet."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/grid.ts gridDistance
TRAP: Pricing an ordinary adjacent square as 10 feet instead of 5.

### R-MOVE-002 diagonal-grid-adjacency
Q: are diagonal squares adjacent on the combat grid; eight-way or four-way grid movement
A: A square is adjacent when it is orthogonally or diagonally adjacent, so the square grid uses eight-way adjacency.
QUOTE: "or diagonally adjacent)."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/grid.ts adjacentCells
TRAP: Using four-way adjacency or Manhattan distance so a diagonal costs two squares.

### R-MOVE-003 shortest-grid-route-distance
Q: how is distance counted on the square grid; shortest route or manhattan distance
A: Count grid distance by the shortest route between the spaces.
QUOTE: "Count by the shortest route."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/grid.ts gridDistance
TRAP: Counting diagonal movement as separate horizontal and vertical legs.

### R-MOVE-004 difficult-grid-square-cost
Q: how much movement does entering a difficult terrain square cost on the grid
A: Entering a Difficult Terrain square costs 2 squares, which is 10 feet on the 5-foot grid.
QUOTE: "costs 2 squares to enter."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/movement.ts MovementWorld traversal policy
TRAP: Charging only 5 feet to enter Difficult Terrain, or multiplying the cost again for overlapping sources.

### R-MOVE-005 opportunity-attack-trigger
Q: when does leaving reach provoke an Opportunity Attack; must the reactor see the mover
A: A creature can make an Opportunity Attack when a creature it can see leaves its reach.
QUOTE: "creature that you can see leaves your reach."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/movement.ts planMovement
TRAP: Triggering when a creature enters reach, or triggering for a creature the reactor cannot see.

### R-MOVE-006 opportunity-attack-precedes-reach-exit
Q: does an Opportunity Attack happen before or after the creature leaves reach
A: The Opportunity Attack occurs immediately before the creature leaves reach.
QUOTE: "The attack occurs right before it leaves your reach."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/movement.ts MovementStep beforeLeaving
TRAP: Moving the creature first and resolving the Opportunity Attack afterward.

### R-MOVE-007 disengage-suppresses-opportunity-attacks
Q: does Disengage prevent Opportunity Attacks and for how long
A: Taking the Disengage action makes your movement not provoke Opportunity Attacks for the rest of the current turn.
QUOTE: "doesn’t provoke Opportunity Attacks for the rest of"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/movement.ts MovementCause
TRAP: Suppressing only the first Opportunity Attack or only the next movement step.

### R-MOVE-008 teleport-and-external-movement-suppress-opportunity-attacks
Q: do teleportation and forced movement provoke Opportunity Attacks
A: Teleportation does not provoke; neither does movement imposed without using the mover's movement, action, Bonus Action, or Reaction.
QUOTE: "moved without using your movement, action, Bonus"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/movement.ts MovementCause
TRAP: Treating every effect commonly called forced movement alike; movement using the mover's action, Bonus Action, Reaction, or Speed can still provoke.

### R-MOVE-009 ranged-normal-and-long-range
Q: what happens when a ranged target is beyond normal range but within long range
A: An attack beyond normal range but within long range is legal with Disadvantage.
QUOTE: "target is beyond normal range, and you can’t attack"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/range.ts attackRangeVerdict
TRAP: Treating the whole long range as normal range.

### R-MOVE-010 beyond-long-range-illegal
Q: can a ranged attack target a creature beyond long range
A: A ranged attack cannot target beyond its long range.
QUOTE: "target beyond long range."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/combat/range.ts attackRangeVerdict
TRAP: Allowing the attack with Disadvantage beyond long range.
