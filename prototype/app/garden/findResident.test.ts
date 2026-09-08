import { expect, it } from 'vitest';
import { residentLookAngles } from './findResident';

it('faces a resident to the right and below without moving the viewer', () => {
  const camera = { x: 0, y: 1.7, z: 0 };
  const target = { x: 2, y: .3, z: 0 };
  const result = residentLookAngles(camera, target, 0);
  expect(result.yaw).toBeCloseTo(-Math.PI / 2);
  expect(result.pitch).toBeCloseTo(Math.atan2(-1.4, 2));
  expect(camera).toEqual({ x: 0, y: 1.7, z: 0 });
  expect(target).toEqual({ x: 2, y: .3, z: 0 });
});
it('keeps yaw stable for a resident directly underneath and bounds pitch', () => {
  expect(residentLookAngles({ x: 0, y: 1.7, z: 0 }, { x: 0, y: 0, z: 0 }, .8)).toEqual({ yaw: .8, pitch: -1.25 });
});
