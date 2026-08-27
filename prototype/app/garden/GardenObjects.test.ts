import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  GARDEN_OBJECT_CARRY_ANCHOR,
  GARDEN_SNACK_AUTHORED_POSITION,
  GARDEN_TOY_AUTHORED_POSITION,
  projectGardenObjectOffer,
  resetGardenObjectPosition,
  resolveGardenObjectPlacement,
  updateCarriedGardenObjectTransform,
} from './GardenObjects';
import { GARDEN_OBSTACLES, isSafeGardenPoint } from './navigation';

describe('garden snack and ring toy presentation', () => {
  it('restores authored session positions for refresh and snack completion', () => {
    expect(GARDEN_SNACK_AUTHORED_POSITION).toEqual([4.8, 0.25, -4.5]);
    expect(GARDEN_TOY_AUTHORED_POSITION).toEqual([-3.8, 0.2, 5.4]);
    expect(resetGardenObjectPosition('food', [9, 0, 2])).toEqual([4.8, 0.25, -4.5]);
    expect(resetGardenObjectPosition('toy', [9, 0, 2])).toEqual([9, 0, 2]);
  });

  it('moves the same held object to the camera-relative carry anchor', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const snack = new THREE.Group();
    const originalId = snack.uuid;
    scene.add(snack);
    camera.position.set(2, 1.7, 3);
    camera.rotation.set(0.15, Math.PI / 3, 0, 'YXZ');

    updateCarriedGardenObjectTransform(camera, snack);

    const expected = new THREE.Vector3(...GARDEN_OBJECT_CARRY_ANCHOR)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    expect(snack.position.x).toBeCloseTo(expected.x, 12);
    expect(snack.position.y).toBeCloseTo(expected.y, 12);
    expect(snack.position.z).toBeCloseTo(expected.z, 12);
    expect(snack.uuid).toBe(originalId);
    expect(snack.parent).toBe(scene);
    expect(scene.children.filter(({ uuid }) => uuid === originalId)).toHaveLength(1);
  });

  it.each([
    { x: 12, z: 10 },
    { x: 0, z: 0 },
    { x: 30, z: 3 },
    { x: 11.8, z: -9.2 },
  ])('places an object on canonical safe ground from %o', (requested) => {
    const result = resolveGardenObjectPlacement('toy', requested, { x: -3.8, z: 5.4 }, GARDEN_OBSTACLES);

    expect(isSafeGardenPoint(result.point, GARDEN_OBSTACLES)).toBe(true);
    expect(result.position[1]).toBe(0.2);
  });

  it('recovers an object to its recorded last-safe point when projection cannot validate', () => {
    const result = resolveGardenObjectPlacement(
      'food',
      { x: 12, z: 10 },
      { x: 8.4, z: 1.5 },
      GARDEN_OBSTACLES,
      () => ({ x: 0, z: 0 }),
    );

    expect(result).toEqual({
      point: { x: 8.4, z: 1.5 },
      position: [8.4, 0.25, 1.5],
      message: "There wasn't a safe spot there, so the snack returned to where you found it.",
    });
  });

  it('places an offered object 1.4 meters ahead of the employee on canonical safe ground', () => {
    const point = projectGardenObjectOffer(
      { x: 10, y: 1.7, z: 10 },
      { x: 0, y: -0.2, z: -1 },
      GARDEN_OBSTACLES,
    );

    expect(point).toEqual({ x: 10, z: 8.6 });
    expect(isSafeGardenPoint(point, GARDEN_OBSTACLES)).toBe(true);
  });
});
