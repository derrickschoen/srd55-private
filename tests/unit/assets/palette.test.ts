import { describe, expect, it } from 'vitest';
import {
  LIGHTNESS_CEILING,
  LIGHTNESS_FLOOR,
  LIGHT_HUE_TARGET,
  NEUTRAL_STEPS,
  PALETTE_RAMPS,
  RAMP_BASE_STEP,
  RAMP_STEPS,
  SHADOW_HUE_TARGET,
  hueDelta,
  neutral,
  paletteHex,
  paletteHsl,
  paletteRgb,
  ramp,
  type RampStep,
} from '../../../src/assets/palette';

function towards(from: number, to: number, target: number): number {
  const wanted = Math.sign(hueDelta(from, target));
  const moved = hueDelta(from, to);
  return wanted === 0 ? 0 : moved * wanted;
}

function labLightness(red: number, green: number, blue: number): number {
  const linear = [red, green, blue].map((channel) => {
    const encoded = channel / 255;
    return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
  });
  const y = 0.2126729 * linear[0]! + 0.7151522 * linear[1]! + 0.072175 * linear[2]!;
  const transformed = y > 216 / 24_389 ? Math.cbrt(y) : (24_389 / 27) * y / 116 + 16 / 116;
  return 116 * transformed - 16;
}

describe('D516 palette rule: 8 hue ramps × 7 steps + 9 neutrals, generated', () => {
  it('turns 12–18° toward blue-violet and loses 10 % saturation per shadow step', () => {
    for (const name of PALETTE_RAMPS) {
      for (let step = RAMP_BASE_STEP - 1; step >= 0; step -= 1) {
        const lighter = paletteHsl(ramp(name, (step + 1) as RampStep));
        const darker = paletteHsl(ramp(name, step as RampStep));
        const remaining = Math.abs(hueDelta(lighter.hue, SHADOW_HUE_TARGET));
        const moved = towards(lighter.hue, darker.hue, SHADOW_HUE_TARGET);
        if (remaining >= 12) {
          expect(moved, `${name} step ${String(step)} hue`).toBeGreaterThanOrEqual(12);
          expect(moved, `${name} step ${String(step)} hue`).toBeLessThanOrEqual(18);
        } else {
          expect(Math.abs(hueDelta(darker.hue, SHADOW_HUE_TARGET))).toBeLessThan(1e-9);
        }
        expect(darker.saturation / lighter.saturation, `${name} step ${String(step)} saturation`).toBeCloseTo(0.9, 6);
        expect(darker.lightness, `${name} step ${String(step)} lightness`).toBeLessThan(lighter.lightness);
      }
    }
  });

  it('turns 6–10° toward yellow per light step, with saturation peaking mid-ramp', () => {
    for (const name of PALETTE_RAMPS) {
      const baseSaturation = paletteHsl(ramp(name, RAMP_BASE_STEP)).saturation;
      for (const step of RAMP_STEPS) {
        expect(paletteHsl(ramp(name, step)).saturation, `${name} step ${String(step)}`).toBeLessThanOrEqual(baseSaturation);
      }
      for (let step = RAMP_BASE_STEP + 1; step < RAMP_STEPS.length; step += 1) {
        const darker = paletteHsl(ramp(name, (step - 1) as RampStep));
        const lighter = paletteHsl(ramp(name, step as RampStep));
        const remaining = Math.abs(hueDelta(darker.hue, LIGHT_HUE_TARGET));
        const moved = towards(darker.hue, lighter.hue, LIGHT_HUE_TARGET);
        if (remaining >= 6) {
          expect(moved, `${name} step ${String(step)} hue`).toBeGreaterThanOrEqual(6);
          expect(moved, `${name} step ${String(step)} hue`).toBeLessThanOrEqual(10);
        }
        expect(lighter.lightness, `${name} step ${String(step)} lightness`).toBeGreaterThan(darker.lightness);
      }
    }
  });

  it('never reaches pure black or white on any ramp or neutral', () => {
    const references = [
      ...PALETTE_RAMPS.flatMap((name) => RAMP_STEPS.map((step) => ramp(name, step))),
      ...NEUTRAL_STEPS.map((step) => neutral(step)),
    ];
    for (const reference of references) {
      const hsl = paletteHsl(reference);
      expect(hsl.lightness).toBeGreaterThanOrEqual(LIGHTNESS_FLOOR);
      expect(hsl.lightness).toBeLessThanOrEqual(LIGHTNESS_CEILING);
      const rgb = paletteRgb(reference);
      expect([rgb.red, rgb.green, rgb.blue].every((channel) => channel === 0)).toBe(false);
      expect([rgb.red, rgb.green, rgb.blue].every((channel) => channel === 255)).toBe(false);
      expect(paletteHex(reference)).toMatch(/^#[0-9a-f]{6}$/u);
    }
  });

  it('neutrals climb monotonically and share one cool hue', () => {
    let previous = -1;
    for (const step of NEUTRAL_STEPS) {
      const hsl = paletteHsl(neutral(step));
      expect(hsl.lightness).toBeGreaterThan(previous);
      expect(hsl.hue).toBe(paletteHsl(neutral(0)).hue);
      previous = hsl.lightness;
    }
  });

  it('keeps every adjacent hue-ramp step clearly separated in perceptual luminance', () => {
    for (const name of PALETTE_RAMPS) {
      for (let step = 1; step < RAMP_STEPS.length; step += 1) {
        const darker = paletteRgb(ramp(name, (step - 1) as RampStep));
        const lighter = paletteRgb(ramp(name, step as RampStep));
        const separation = labLightness(lighter.red, lighter.green, lighter.blue) - labLightness(darker.red, darker.green, darker.blue);
        expect(separation, `${name} ${String(step - 1)}→${String(step)}`).toBeGreaterThanOrEqual(6);
        expect(separation, `${name} ${String(step - 1)}→${String(step)}`).toBeLessThanOrEqual(20);
      }
    }
  });

  it('is addressed only by (ramp, step): out-of-range steps throw', () => {
    expect(() => paletteHsl({ ramp: 'stone', step: 7 as RampStep })).toThrow(/no step 7/u);
  });
});
