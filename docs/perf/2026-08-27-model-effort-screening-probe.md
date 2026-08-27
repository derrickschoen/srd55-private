# Model × effort screening probe — DM-turn latency and blind-judged quality

Date: 2026-08-27. **This is a screening probe, NOT part of the pre-registered
D320 E-series** (single fixture, 3 repetitions, no session pairing, no
counterfactual quality rollouts). Its numbers inform E08's design; they do not
substitute for it.

## Method

One fixed DM-steering payload (the Cinder Rite round-2 state: 5 PCs including
an unconscious druid at 1 death-save failure, Ashmaw + drummer + minion,
brazier/oil-cask/rubble/dim-light terrain; JSON turn-program output). 18
sequential `codex exec` calls, no concurrency: {luna low/medium/high, terra
low/medium, sol low} × 3 reps. Wall-clock and token counts recorded per call.

Quality: all 18 plans anonymized (deterministic shuffle, labels P01–P18) and
graded blind by a three-judge panel — **gpt-5.6-sol high**, **claude-opus-5
high**, and **Fable (supervisor, in-context)**, the Fable grades recorded
before either external verdict was read. Rubric /10: target priority &
threat 3, resource & action economy 3, terrain & positioning 2, contingency
quality 2.

## Results (medians; panel = mean of three judges over 3 reps)

| Config | Wall median | Tokens ≈ | Panel quality /10 | Per-rep panel |
|---|---:|---:|---:|---|
| **sol low** | 26.8s | 8.6k | **8.78** | 8.8 / 8.0 / 9.5 |
| luna high | 162.1s | 13–17k | 8.33 | 8.8 / 8.2 / 8.0 |
| terra medium | 19.8s | 8.7k | 6.44 | 6.3 / 6.3 / 6.7 |
| luna medium | 39.6s | 9.1k | 6.00 | 7.0 / 6.3 / 4.7 |
| luna low | 23.2s | 8.2k | 5.44 | 5.0 / 5.7 / 5.7 |
| terra low | 9.9s | 8.2k | 3.78 | 1.7 / 2.0 / **7.7** |

All three judges independently chose the same best plan (P17, a sol-low rep)
and the same two worst (P03, P14 — both terra-low reps).

## Findings

1. **sol low dominates luna high**: higher panel quality at 6× less wall time
   and ~half the tokens. The unanimous best plan of all 18 was sol low.
2. **luna's effort ladder buys quality monotonically** (5.44 → 6.00 → 8.33)
   but the high tier costs 162s/call — untenable for live-table pacing.
3. **terra low is fast but catastrophically unreliable**: 2 of 3 reps
   produced the panel's two worst plans (attacks declared from outside reach;
   Ashmaw casting Healing Word on the *party's* downed druid — side
   confusion). Its third rep scored 7.7 — high variance, unusable unguarded.
4. **terra medium is consistent but mediocre** (6.3–6.7 band) — the incumbent
   is beaten on both axes by sol low in this probe.
5. **Failure taxonomy** across all configs: geometric errors (out-of-reach
   attacks, ending movement in occupied squares) and rules errors
   (two leveled spells in one turn — SRD "One Spell with a Spell Slot per
   Turn", srd-5.2.1.txt:6399-6403) dominate; target selection was broadly
   right (Orin execution, Sera's Bless concentration) even in weak plans.
   Harness-side legality enumeration (E05/E07 capabilities) would erase most
   of the gap between mid-tier configs.

## Judge arbitration note

Opus and sol penalized two plans for "wasting" Ashmaw's Healing Word after
Hold Person; the supervisor credited the restraint. SRD verbatim supports the
supervisor: one spell slot per turn (line 6399). Under the natural slot
reading of the statblock, forgoing the bonus action was rules-correct. The
disagreement does not change any ordering.

## Implications for E08 (owner decision pending)

- Add **sol low** as an arm; the pre-registered terra-vs-luna-at-medium cross
  misses the probe's best config entirely.
- Consider an effort axis (low/medium) rather than medium-only.
- terra low's variance argues for per-rep reliability metrics
  (correction-exhaustion), which E08 already carries.

Raw artifacts: `~/.claude/jobs/c68ffdd0/tmp/model-probe/` (prompt, 18 logs,
judge packet + key, three judge verdicts, aggregate script).
