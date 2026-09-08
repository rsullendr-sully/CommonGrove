import { expect, it } from 'vitest';
import { groundedStep } from './groundedStep';
import { RESIDENT_WORLD_SCALE } from './residents';

it('keeps the stance foot stationary in world space during forward travel', () => {
  const a = groundedStep(.04, 0);
  const b = groundedStep(.08, 0);
  expect(a.lift).toBe(0);
  expect(b.lift).toBe(0);
  expect(.04 + a.forward * RESIDENT_WORLD_SCALE).toBeCloseTo(.08 + b.forward * RESIDENT_WORLD_SCALE);
});

it('lifts the returning foot while the opposite foot supports the body', () => {
  expect(groundedStep(.42 * .8, 0).lift).toBeGreaterThan(.06);
  expect(groundedStep(.42 * .8, .5).lift).toBe(0);
});

it('lands continuously and repeats after one stride', () => {
  expect(groundedStep(.42, 0)).toEqual(groundedStep(0, 0));
  expect(groundedStep(.42 - .000001, 0).forward).toBeCloseTo(groundedStep(0, 0).forward, 4);
  expect(groundedStep(.42 - .000001, 0).lift).toBeCloseTo(0, 4);
});
