103,907
**ACCEPT — 1c5fd117.** No P1/P2/P3 findings. Both previous P2s are resolved.

- **Movement cap:** [intent-resolver.ts:383](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/intent-resolver.ts:383) matches the existing planning-window convention. Active `remaining` already includes executed Dash grants minus movement spent; non-active actors use fresh speed, avoiding stale prior-turn balances. The cap remains scoped to pursuit.
- **Independent execution reproduction:** with **5 feet remaining**, pursuit resolves to `(2,0)`, costs **5 feet**, and executes Search successfully with the action spent. With **0 remaining**, it resolves to `[]`/0 and successfully Searches. Non-active controls with stale remaining values of 5 and 0 both resolve using the fresh 30-foot budget.
- **Bonus bypass:** [offer-declarations.ts:657](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/offers/offer-declarations.ts:657) detects precisely the no-cue branch. Its shared empty bonus list covers both Dodge and End Turn. The Goblin reproduction now returns exactly `['Dodge', 'End Turn']`; normal/pursuit composition remains enabled.
- **Witnesses:** expectations are independently justified bounds and origin/menu assertions, not regenerated output. The pre-fix 30-foot pursuit violates both new movement witnesses; the previous six-option Goblin menu violates the strengthened menu witness. The five-foot witness also exercises actual session execution.

No additional regression found in the three-file fix. No files were written.

BLIND-01 REVIEW B2 FIX R1 DONE
