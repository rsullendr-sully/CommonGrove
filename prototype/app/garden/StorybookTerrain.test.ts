import { describe, expect, it } from 'vitest';
import type { GardenCorridor } from './environmentLayout';
import { createSteppingStones, STEPPING_STONE_HEIGHT } from './StorybookTerrain';

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
});
