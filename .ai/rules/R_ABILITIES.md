### R-ABIL-001 point-buy-costs
Q: point buy costs budget minimum maximum before background bonus
A: 27 points; 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9; the point-cost table permits scores 8–15 before bonuses.
QUOTE: "8 0 12 4 9 1 13 5 10 2 14 7 11 3 15 9"
SRC: docs/srd/source/ability-score-generation.txt
CODE: src/rules/ability-score-generation-srd.ts
TRAP: Using the later general score cap of 20 as the point-buy maximum, or pricing 14 and 15 as one point per increase.

### R-ABIL-002 standard-array
Q: what is the standard ability score array
A: 15, 14, 13, 12, 10, 8.
QUOTE: "your abilities: 15, 14, 13, 12, 10, 8."
SRC: docs/srd/source/ability-score-generation.txt
CODE: src/rules/ability-score-generation-srd.ts (`STANDARD_ARRAY`)
TRAP: NONE

### R-ABIL-003 background-ability-bonuses
Q: where do 2024 ability score bonuses come from; background or species
A: BACKGROUND, not species: increase one listed ability by 2 and another by 1, or all three listed abilities by 1, with no increase above 20.
QUOTE: "Increase one by 2 and another one by 1"
SRC: docs/srd/source/backgrounds.txt
CODE: src/builder/background-choices.ts
TRAP: Applying the 2014 species ability score increases, or adding both species and background increases.

### R-ABIL-004 asi-class-level-four
Q: when do Ability Score Improvements arrive in multiclassing; does total character level 4 grant ASI
A: ASIs are class features reached at CLASS level 4 and later listed levels; a character split across seven classes at level 1 in each gets NONE.
QUOTE: "Level 4: Ability Score Improvement"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/class-level-features-srd.ts
TRAP: Awarding an ASI whenever total character level reaches 4, 8, and so on. Multiclass characters must reach the feature level in a class.

### R-ABIL-005 ability-modifier-table
Q: how is an ability score converted to its modifier; modifier table formula
A: Use the SRD table: 1=−5; 2–3=−4; 4–5=−3; 6–7=−2; 8–9=−1; 10–11=+0; 12–13=+1; 14–15=+2; 16–17=+3; 18–19=+4; 20–21=+5, continuing by pairs to 30=+10.
QUOTE: "10–11 +0"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/ability-score.ts (`modifier`)
TRAP: Rounding toward zero for scores below 10. The equivalent calculation rounds down, so 9 gives −1.
