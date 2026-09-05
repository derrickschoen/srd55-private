/**
 * The whole art palette is GENERATED from one rule (D516). Nothing in the
 * generator names an RGB value; every pixel is addressed as (ramp, step).
 *
 * Rule, per hue ramp (7 steps, 3 is the base):
 * - toward shadow (3 → 0): the hue turns 15° per step toward blue-violet
 *   (262°), saturation drops 10 % per step relative, lightness drops 11 points;
 * - toward light (3 → 6): the hue turns 8° per step toward yellow (55°),
 *   lightness rises 9 points, saturation falls 8 % per step so it peaks
 *   mid-ramp;
 * - lightness is clamped to [7, 93] so no step is ever pure black or white.
 *
 * Neutrals are 9 steps of a cool grey (hue 225°, 6 % saturation) from 7 % to
 * 92 % lightness.
 */

export const PALETTE_RAMPS = [
  'stone',
  'wood',
  'earth',
  'moss',
  'cloth-warm',
  'cloth-cool',
  'metal',
  'skin',
] as const;
export type PaletteRamp = (typeof PALETTE_RAMPS)[number];

export const RAMP_STEPS = [0, 1, 2, 3, 4, 5, 6] as const;
export type RampStep = (typeof RAMP_STEPS)[number];
export const RAMP_BASE_STEP: RampStep = 3;

export const NEUTRAL_STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export type NeutralStep = (typeof NEUTRAL_STEPS)[number];

/** A colour is only ever named by its place in a ramp. */
export type PaletteColorRef =
  | { readonly ramp: PaletteRamp; readonly step: RampStep }
  | { readonly ramp: 'neutral'; readonly step: NeutralStep };

export interface Hsl {
  readonly hue: number;
  readonly saturation: number;
  readonly lightness: number;
}

export interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export const SHADOW_HUE_TARGET = 262;
export const LIGHT_HUE_TARGET = 55;
export const SHADOW_HUE_SHIFT = 15;
export const LIGHT_HUE_SHIFT = 8;
export const SHADOW_SATURATION_FACTOR = 0.9;
export const LIGHT_SATURATION_FACTOR = 0.92;
export const SHADOW_LIGHTNESS_DROP = 11;
export const LIGHT_LIGHTNESS_RISE = 9;
export const LIGHTNESS_FLOOR = 7;
export const LIGHTNESS_CEILING = 93;

const RAMP_BASES: Readonly<Record<PaletteRamp, Hsl>> = {
  stone: { hue: 215, saturation: 10, lightness: 46 },
  wood: { hue: 28, saturation: 45, lightness: 40 },
  earth: { hue: 35, saturation: 33, lightness: 42 },
  moss: { hue: 105, saturation: 35, lightness: 38 },
  'cloth-warm': { hue: 12, saturation: 62, lightness: 48 },
  'cloth-cool': { hue: 222, saturation: 55, lightness: 48 },
  metal: { hue: 205, saturation: 12, lightness: 58 },
  skin: { hue: 26, saturation: 48, lightness: 66 },
};

const NEUTRAL_HUE = 225;
const NEUTRAL_SATURATION = 6;

function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/** Signed shortest arc from `from` to `to`, in (-180, 180]. */
export function hueDelta(from: number, to: number): number {
  const raw = wrapHue(to - from);
  return raw > 180 ? raw - 360 : raw;
}

function turnToward(hue: number, target: number, amount: number): number {
  const delta = hueDelta(hue, target);
  const magnitude = Math.min(Math.abs(delta), amount);
  return wrapHue(hue + Math.sign(delta) * magnitude);
}

function clampLightness(value: number): number {
  return Math.min(LIGHTNESS_CEILING, Math.max(LIGHTNESS_FLOOR, value));
}

function rampHsl(base: Hsl): readonly Hsl[] {
  const steps: Hsl[] = new Array<Hsl>(RAMP_STEPS.length);
  steps[RAMP_BASE_STEP] = base;
  let current = base;
  for (let step = RAMP_BASE_STEP - 1; step >= 0; step -= 1) {
    current = {
      hue: turnToward(current.hue, SHADOW_HUE_TARGET, SHADOW_HUE_SHIFT),
      saturation: current.saturation * SHADOW_SATURATION_FACTOR,
      lightness: clampLightness(current.lightness - SHADOW_LIGHTNESS_DROP),
    };
    steps[step] = current;
  }
  current = base;
  for (let step = RAMP_BASE_STEP + 1; step < RAMP_STEPS.length; step += 1) {
    current = {
      hue: turnToward(current.hue, LIGHT_HUE_TARGET, LIGHT_HUE_SHIFT),
      saturation: current.saturation * LIGHT_SATURATION_FACTOR,
      lightness: clampLightness(current.lightness + LIGHT_LIGHTNESS_RISE),
    };
    steps[step] = current;
  }
  return steps;
}

function neutralHsl(): readonly Hsl[] {
  return NEUTRAL_STEPS.map((step) => ({
    hue: NEUTRAL_HUE,
    saturation: NEUTRAL_SATURATION,
    lightness: clampLightness(7 + step * 10.625),
  }));
}

export function hslToRgb(color: Hsl): Rgb {
  const h = wrapHue(color.hue) / 360;
  const s = Math.min(1, Math.max(0, color.saturation / 100));
  const l = Math.min(1, Math.max(0, color.lightness / 100));
  const channel = (t: number): number => {
    const wrapped = ((t % 1) + 1) % 1;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    if (wrapped < 1 / 6) return p + (q - p) * 6 * wrapped;
    if (wrapped < 1 / 2) return q;
    if (wrapped < 2 / 3) return p + (q - p) * (2 / 3 - wrapped) * 6;
    return p;
  };
  return {
    red: Math.round(channel(h + 1 / 3) * 255),
    green: Math.round(channel(h) * 255),
    blue: Math.round(channel(h - 1 / 3) * 255),
  };
}

const RAMP_TABLE: Readonly<Record<PaletteRamp, readonly Hsl[]>> = Object.fromEntries(
  PALETTE_RAMPS.map((ramp) => [ramp, rampHsl(RAMP_BASES[ramp])] as const),
) as Readonly<Record<PaletteRamp, readonly Hsl[]>>;
const NEUTRAL_TABLE: readonly Hsl[] = neutralHsl();

export function paletteHsl(reference: PaletteColorRef): Hsl {
  const table = reference.ramp === 'neutral' ? NEUTRAL_TABLE : RAMP_TABLE[reference.ramp];
  const entry = table[reference.step];
  if (entry === undefined) throw new Error(`Palette ${reference.ramp} has no step ${String(reference.step)}.`);
  return entry;
}

export function paletteRgb(reference: PaletteColorRef): Rgb {
  return hslToRgb(paletteHsl(reference));
}

export function paletteHex(reference: PaletteColorRef): string {
  const rgb = paletteRgb(reference);
  return `#${[rgb.red, rgb.green, rgb.blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function ramp(name: PaletteRamp, step: RampStep): PaletteColorRef {
  return { ramp: name, step };
}

export function neutral(step: NeutralStep): PaletteColorRef {
  return { ramp: 'neutral', step };
}
