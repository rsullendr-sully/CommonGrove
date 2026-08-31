import * as THREE from 'three';

export const GARDEN_SURFACE_SIZE = 96;
export const GARDEN_SURFACE_REPEAT = 10;

export const GARDEN_RENDER_QUALITY = {
  minimumDpr: 0.7,
  maximumDpr: 1,
  antialias: false,
  shadowMapSize: 1024,
} as const;

export type GardenTextureSurface = 'grass' | 'earth' | 'limestone' | 'wood';

export const GARDEN_TEXTURE_PATHS = {
  grass: '/textures/common-grove-grass.png',
  earth: '/textures/common-grove-earth.png',
  limestone: '/textures/common-grove-limestone.png',
  wood: '/textures/common-grove-wood.png',
} as const satisfies Record<GardenTextureSurface, string>;

const GARDEN_TEXTURE_REPEATS: Record<GardenTextureSurface, readonly [number, number]> = {
  grass: [18, 18],
  earth: [5, 8],
  limestone: [2.5, 2.5],
  wood: [1.5, 3],
};

const COARSE_SIZE = 12;
const BASE_COLOR = [112, 156, 91] as const;

function nextRandom(state: { value: number }) {
  state.value = (state.value * 16807) % 2147483647;
  return state.value;
}

function clampByte(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

export function generateGardenSurfacePixels(seed = 731) {
  const state = { value: Math.max(1, seed % 2147483647) };
  const coarse = new Int8Array(COARSE_SIZE * COARSE_SIZE);
  for (let index = 0; index < coarse.length; index += 1) {
    coarse[index] = (nextRandom(state) % 25) - 12;
  }

  const sample = (x: number, y: number) => coarse[
    ((y + COARSE_SIZE) % COARSE_SIZE) * COARSE_SIZE
      + ((x + COARSE_SIZE) % COARSE_SIZE)
  ];
  const data = new Uint8Array(GARDEN_SURFACE_SIZE * GARDEN_SURFACE_SIZE * 4);

  for (let y = 0; y < GARDEN_SURFACE_SIZE; y += 1) {
    for (let x = 0; x < GARDEN_SURFACE_SIZE; x += 1) {
      const coarseX = (x / GARDEN_SURFACE_SIZE) * COARSE_SIZE;
      const coarseY = (y / GARDEN_SURFACE_SIZE) * COARSE_SIZE;
      const left = Math.floor(coarseX);
      const top = Math.floor(coarseY);
      const blendX = coarseX - left;
      const blendY = coarseY - top;
      const topBlend = THREE.MathUtils.lerp(sample(left, top), sample(left + 1, top), blendX);
      const bottomBlend = THREE.MathUtils.lerp(sample(left, top + 1), sample(left + 1, top + 1), blendX);
      const broadVariation = THREE.MathUtils.lerp(topBlend, bottomBlend, blendY);
      const fineVariation = (nextRandom(state) % 9) - 4;
      const variation = broadVariation + fineVariation;
      const offset = (y * GARDEN_SURFACE_SIZE + x) * 4;

      data[offset] = clampByte(BASE_COLOR[0] + variation, 92, 132);
      data[offset + 1] = clampByte(BASE_COLOR[1] + variation, 136, 176);
      data[offset + 2] = clampByte(BASE_COLOR[2] + variation * 0.72, 72, 112);
      data[offset + 3] = 255;
    }
  }

  return data;
}

export function createGardenSurfaceTexture(seed = 731) {
  const texture = new THREE.DataTexture(
    generateGardenSurfacePixels(seed),
    GARDEN_SURFACE_SIZE,
    GARDEN_SURFACE_SIZE,
    THREE.RGBAFormat,
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(GARDEN_SURFACE_REPEAT, GARDEN_SURFACE_REPEAT);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function prepareGardenTexture(
  texture: THREE.Texture,
  surface: GardenTextureSurface,
): THREE.Texture {
  const repeat = GARDEN_TEXTURE_REPEATS[surface];
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(...repeat);
  texture.needsUpdate = true;
  return texture;
}
