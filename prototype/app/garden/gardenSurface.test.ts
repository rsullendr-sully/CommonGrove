import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  GARDEN_SURFACE_REPEAT,
  GARDEN_SURFACE_SIZE,
  createGardenSurfaceTexture,
  generateGardenSurfacePixels,
} from './gardenSurface';
import * as gardenSurface from './gardenSurface';

describe('garden surface', () => {
  it('generates deterministic opaque pixels with restrained spring colors', () => {
    const first = generateGardenSurfacePixels(731);
    const second = generateGardenSurfacePixels(731);

    expect(first).toEqual(second);
    expect(first).toHaveLength(GARDEN_SURFACE_SIZE * GARDEN_SURFACE_SIZE * 4);
    const channels = [[], [], []] as number[][];
    for (let offset = 0; offset < first.length; offset += 4) {
      channels[0].push(first[offset]);
      channels[1].push(first[offset + 1]);
      channels[2].push(first[offset + 2]);
    }
    expect(Math.min(...channels[0])).toBeGreaterThanOrEqual(92);
    expect(Math.max(...channels[0])).toBeLessThanOrEqual(132);
    expect(Math.min(...channels[1])).toBeGreaterThanOrEqual(136);
    expect(Math.max(...channels[1])).toBeLessThanOrEqual(176);
    expect(Math.min(...channels[2])).toBeGreaterThanOrEqual(72);
    expect(Math.max(...channels[2])).toBeLessThanOrEqual(112);
    expect(first.filter((_, index) => index % 4 === 3).every((alpha) => alpha === 255)).toBe(true);
  });

  it('uses softened filtering and a lower repeat count', () => {
    const texture = createGardenSurfaceTexture();

    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(texture.repeat.toArray()).toEqual([GARDEN_SURFACE_REPEAT, GARDEN_SURFACE_REPEAT]);
    expect(GARDEN_SURFACE_REPEAT).toBeLessThanOrEqual(12);
    texture.dispose();
  });

  it('prepares hand-painted textures for color-correct seamless garden materials', () => {
    const prepareGardenTexture = (gardenSurface as typeof gardenSurface & {
      prepareGardenTexture?: (
        texture: THREE.Texture,
        surface: 'grass' | 'earth' | 'limestone' | 'wood',
      ) => THREE.Texture;
    }).prepareGardenTexture;

    expect(prepareGardenTexture).toBeTypeOf('function');
    if (!prepareGardenTexture) return;

    const expectedRepeats = {
      grass: [18, 18],
      earth: [5, 8],
      limestone: [2.5, 2.5],
      wood: [1.5, 3],
    } as const;

    for (const [surface, repeat] of Object.entries(expectedRepeats)) {
      const texture = new THREE.Texture();
      const prepared = prepareGardenTexture(
        texture,
        surface as keyof typeof expectedRepeats,
      );

      expect(prepared).toBe(texture);
      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
      expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(texture.magFilter).toBe(THREE.LinearFilter);
      expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
      expect(texture.repeat.toArray()).toEqual(repeat);
      expect(texture.version).toBe(1);
    }
  });
});
