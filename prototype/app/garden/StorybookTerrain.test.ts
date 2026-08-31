import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createStorybookEnvironmentLayout, type GardenCorridor } from './environmentLayout';
import {
  createGardenPathBeds,
  createSoilMaterials,
  createSteppingStones,
  STEPPING_STONE_HEIGHT,
} from './StorybookTerrain';

describe('storybook stepping stones', () => {
  it('keeps every path stone top within three centimeters of walkable ground', () => {
    const corridor: GardenCorridor = {
      id: 'spawn-to-pond',
      start: { x: 0, z: 17 },
      end: { x: 0, z: 7.7 },
      halfWidth: 1.35,
    };
    const stones = createSteppingStones([corridor]);
    expect(stones).toHaveLength(5);
    for (const stone of stones) {
      const top = stone.position[1] + (STEPPING_STONE_HEIGHT * stone.scale[1]) / 2;
      expect(top).toBeLessThanOrEqual(0.03);
    }
  });

  it('keeps the inset stones subordinate to the walking path', () => {
    const stones = createSteppingStones(createStorybookEnvironmentLayout().corridors);

    expect(Math.max(...stones.map((stone) => stone.scale[0]))).toBeLessThanOrEqual(0.5);
    expect(Math.max(...stones.map((stone) => stone.scale[2]))).toBeLessThanOrEqual(0.36);
    for (const stone of stones) {
      const top = stone.position[1] + (STEPPING_STONE_HEIGHT * stone.scale[1]) / 2;
      expect(top).toBeLessThan(0.03);
    }
  });

  it('creates one deterministic soft path bed per corridor', () => {
    const corridors = createStorybookEnvironmentLayout().corridors;
    const beds = createGardenPathBeds(corridors);

    expect(beds).toHaveLength(corridors.length);
    expect(createGardenPathBeds(corridors)).toEqual(beds);
    expect(beds.every((bed) => bed.width >= 0.78 && bed.width <= 1.08)).toBe(true);
  });

  it('uses the earth finish on the actual planting-bed soil', () => {
    const earthTexture = new THREE.Texture();
    const materials = createSoilMaterials(earthTexture);

    expect(materials).toHaveLength(3);
    expect(materials.every((material) => material.map === earthTexture)).toBe(true);
    expect(materials.every((material) => material.roughness === 1)).toBe(true);

    materials.forEach((material) => material.dispose());
    earthTexture.dispose();
  });
});
