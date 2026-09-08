import { RESIDENT_WORLD_SCALE } from './residents';

// Distance driven: the stance foot cancels forward travel at the rendered scale.
// 60% stance gives a brief double-support interval, never two airborne feet.
export function groundedStep(distance: number, offset: number) {
  const cycle = .42;
  const phase = ((distance / cycle + offset) % 1 + 1) % 1;
  const reach = cycle * .6 / RESIDENT_WORLD_SCALE;
  if (phase < .6) return { forward: reach / 2 - phase * cycle / RESIDENT_WORLD_SCALE, lift: 0 };
  const swing = (phase - .6) / .4;
  const ease = swing * swing * (3 - 2 * swing);
  return { forward: -reach / 2 + reach * ease, lift: Math.sin(swing * Math.PI) ** 2 * .1 };
}
