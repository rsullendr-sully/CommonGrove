import { expect, it } from 'vitest';
import { spriteSquash } from './spriteSquash';
import { characterActing } from './characterActing';

it('renders the brief greeting perk and settles without losing ground contact', () => {
  const greeting = characterActing('greet', 1, 1.1, 0, false);
  const perk = spriteSquash(undefined, false, greeting.perk);
  expect(perk.y).toBeGreaterThan(1);
  expect(perk.x * perk.y * perk.z).toBeCloseTo(1);
  expect(perk.lift + .13 * perk.y).toBeCloseTo(.13);
  expect(spriteSquash(undefined, false, characterActing('greet', 3, 3, 0, false).perk).y).toBe(1);
  expect(spriteSquash(undefined, true, greeting.perk).y).toBe(1);
});

it('keeps planted steps grounded by deforming above the sole height', () => {
  const pose = spriteSquash(.0525, false);
  expect(pose.y).toBeLessThan(1);
  expect(pose.x * pose.y * pose.z).toBeCloseTo(1);
  expect(pose.lift + .13 * pose.y).toBeCloseTo(.13);
});
it('has no perpetual bounce at rest or with reduced motion', () => {
  expect(spriteSquash(undefined, false)).toEqual({ x: 1, y: 1, z: 1, lift: 0 });
  expect(spriteSquash(.0525, true)).toEqual({ x: 1, y: 1, z: 1, lift: 0 });
});
