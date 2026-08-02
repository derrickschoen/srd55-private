/**
 * How long a character's OWN free text may be — in ONE place.
 *
 * The same argument `src/domain/origin-limits.ts` and
 * `src/domain/weapon-limits.ts` make, and the same defect they were written to
 * prevent: `characters.notes` is plain `TEXT` with no length CHECK, so the
 * database bounds none of this and every boundary that does must agree. A share
 * cap set BELOW a write cap is not a stricter boundary — it is a character the
 * app lets you build and then refuses to share, with the only remedy being to
 * delete text you deliberately typed.
 *
 * Today share and portable-backup validation consume these values. FF-B will
 * make the authoring command consume them too. Keeping the limits here makes
 * those boundaries share one definition instead of drifting independently.
 *
 * THE VALUE IS A BOUNDARY JUDGEMENT, NOT A RESTATEMENT OF THE COLUMN. D142
 * makes a character's own notes the same generous long-form field as their
 * backstory: one written-text consent toggle, one 20,000-code-point cap.
 *
 * THE RESIDUAL RISK, STATED: a longer note can still reach the column through a
 * backup document, whose row contract is an unbounded `z.string()`. Such a
 * character exports fine with written-text consent OFF and is REFUSED —
 * loudly, naming the field — with it ON. That is the honest failure: the
 * alternative is truncating text the user typed and telling them nothing.
 */
export const CHARACTER_TEXT_LIMITS = Object.freeze({
  alignment: 120,
  appearance: 4_000,
  backstory: 20_000,
  notes: 20_000,
});
