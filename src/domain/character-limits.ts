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
 * TODAY `validateShareDocument` IS THE ONLY CONSUMER, because there is no
 * command that writes `characters.notes` at all — the column is read into
 * `CharacterRecord` and restored by backup and undo, and nothing else touches
 * it. That is exactly why the number lives here rather than inline in the share
 * validator: the day a write command appears it must derive from this rather
 * than invent its own, and the two would then be unable to drift apart.
 *
 * THE VALUE IS A BOUNDARY JUDGEMENT, NOT A RESTATEMENT OF THE COLUMN. 2,000 is
 * what every other user-typed `notes` field in this application already allows
 * (`WEAPON_TEXT_LIMITS.notes`, `ORIGIN_TEXT_LIMITS.notes`,
 * `SHEET_TEXT_LIMITS.armor_notes`), and a character's own note is the same kind
 * of writing as a note about their armour. Choosing a different number for this
 * one would be a claim that it is a different kind of field, and it is not.
 *
 * THE RESIDUAL RISK, STATED: a longer note can still reach the column through a
 * backup document, whose row contract is an unbounded `z.string()`. Such a
 * character exports fine with the notes option OFF and is REFUSED — loudly,
 * naming the field — with it ON. That is the honest failure: the alternative is
 * truncating text the user typed and telling them nothing.
 */
export const CHARACTER_TEXT_LIMITS = Object.freeze({
  notes: 2_000,
});
