/**
 * FROZEN REFERENCE — do not edit to follow the reader.
 *
 * The eight gate patterns of `src/simulation/spell-source-reader.ts`
 * (`GATE_DAMAGE_SAVE_PATTERNS`) exactly as they stood before the
 * `(?<![^.])` sentence-start lookbehind was added (main 45c2056a,
 * spell-source-reader.ts:1189-1196), in the same priority order.
 *
 * The lookbehind is claimed to be a pure speed change: it prunes only match
 * starts that can never be the leftmost match. This copy is what
 * tests/unit/simulation/gate-pattern-sentence-start-lookbehind.test.ts
 * compares the live patterns against, clause by clause, on every spell body
 * of both SRD corpora. A deliberate change to what a gate pattern matches is
 * a different change; it should update or retire that test knowingly, not
 * edit these literals to match.
 */
export const PRE_LOOKBEHIND_GATE_PATTERNS: readonly RegExp[] = Object.freeze([
  /[^.]*Dexterity saving throw[^.]*Grappled[^.]*\.[\s\S]{0,240}?grapples[^.]*damage[^.]*4d6[^.]*\./iu,
  /[^.]*must succeed on a Wisdom saving throw or become cursed[\s\S]{0,520}?extra 1d8 Necrotic damage[^.]*\./iu,
  /[^.]*Constitution saving throw[\s\S]{0,120}?successful save[^.]*spell has no effect[\s\S]{0,1500}?(?:extra 1d4 damage|1d4[^.]*less damage)[^.]*\./iu,
  /[^.]*Strength saving throw[\s\S]{0,260}?successful save[^.]*spell ends[\s\S]{0,180}?While Restrained[^.]*1d6 Piercing damage[^.]*\./iu,
  /[^.]*Wisdom saving throw or have the Charmed condition[\s\S]{0,260}?While Charmed[^.]*5d10 Psychic damage[^.]*\./iu,
  /[^.]*Intelligence saving throw[\s\S]{0,900}?affected target[\s\S]{0,420}?2d8 Psychic damage[^.]*\./iu,
  /[^.]*Constitution saving throw[\s\S]{0,360}?subtracts 1d8 from all its damage rolls[^.]*\./iu,
  /[^.]*1d6 Fire damage[\s\S]{0,220}?start of each of its turns[\s\S]{0,180}?Constitution saving throw[\s\S]{0,120}?successful save[^.]*spell ends[^.]*\./iu,
]);
