# Movement

Movement has a separate turn budget. Difficult terrain consumes additional movement, and the engine owns geometry, path legality, visibility, cover, and exact reach.

- close_to_melee asks the engine to reach a melee-effective position relative to the anchor.
- maintain_range asks it to preserve a ranged-effective position.
- withdraw asks it to increase separation; hold_position asks it not to reposition.
- none forbids movement. The remaining values declare when movement is permitted, but none bypass path, budget, or action legality.
- opportunity_risk selects avoid, accept_if_needed, or accept. It does not make unsafe movement legal.

A visible creature leaving reach with its own action, Bonus Action, Reaction, or movement can trigger an Opportunity Attack immediately before it leaves. Use semantic anchors and focused movement, path, reach, cover, or visibility queries; do not supply coordinates or construct paths.
