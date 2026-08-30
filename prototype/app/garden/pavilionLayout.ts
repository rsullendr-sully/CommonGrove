export const PAVILION_CENTER = { x: -12.2, z: -12.4 } as const;
export const PAVILION_LOCAL_POSTS = [
  { x: -2, z: -2 }, { x: 2, z: -2 },
  { x: -2, z: 2 }, { x: 2, z: 2 },
] as const;
export const PAVILION_LOCAL_BENCHES = [
  {
    x: -1.9,
    z: 0.15,
    centerY: 0.385,
    width: 0.65,
    height: 0.45,
    depth: 2.1,
    collisionSamples: [
      { x: 0, z: -0.7, radius: 0.5 },
      { x: 0, z: 0, radius: 0.5 },
      { x: 0, z: 0.7, radius: 0.5 },
    ],
  },
  {
    x: 1.9,
    z: 0.15,
    centerY: 0.385,
    width: 0.65,
    height: 0.45,
    depth: 2.1,
    collisionSamples: [
      { x: 0, z: -0.7, radius: 0.5 },
      { x: 0, z: 0, radius: 0.5 },
      { x: 0, z: 0.7, radius: 0.5 },
    ],
  },
] as const;
export const PAVILION_BOOKSHELF = {
  x: 0,
  z: -1.35,
  centerY: 1.185,
  width: 2.9,
  height: 2.05,
  depth: 0.42,
  collisionSamples: [
    { x: -1.05, z: 0, radius: 0.46 },
    { x: -0.35, z: 0, radius: 0.46 },
    { x: 0.35, z: 0, radius: 0.46 },
    { x: 1.05, z: 0, radius: 0.46 },
  ],
} as const;
export const PAVILION_PERMANENT_FURNITURE = [PAVILION_BOOKSHELF] as const;
export const PAVILION_READING_POINT = {
  x: PAVILION_CENTER.x,
  z: PAVILION_CENTER.z + 0.55,
} as const;
const localObstacle = (x: number, z: number, radius: number) => ({
  x: PAVILION_CENTER.x + x,
  z: PAVILION_CENTER.z + z,
  radius,
});
export const PAVILION_OBSTACLES = [
  ...PAVILION_LOCAL_POSTS.map(({ x, z }) => localObstacle(x, z, 0.45)),
  ...PAVILION_LOCAL_BENCHES.flatMap(({ x, z, collisionSamples }) => (
    collisionSamples.map((sample) => localObstacle(x + sample.x, z + sample.z, sample.radius))
  )),
  ...PAVILION_PERMANENT_FURNITURE.flatMap(({ x, z, collisionSamples }) => (
    collisionSamples.map((sample) => localObstacle(x + sample.x, z + sample.z, sample.radius))
  )),
] as const;
export const PAVILION_SURFACE = {
  deck: { centerY: 0.08, height: 0.16, radiusTop: 3.1, radiusBottom: 3.2 },
  approachSteps: [
    { z: 4.2, centerY: 0.02, height: 0.04, width: 2.6, depth: 0.62 },
    { z: 3.82, centerY: 0.04, height: 0.08, width: 2.6, depth: 0.62 },
    { z: 3.44, centerY: 0.06, height: 0.12, width: 2.6, depth: 0.62 },
    { z: 3.06, centerY: 0.08, height: 0.16, width: 2.6, depth: 0.62 },
  ],
} as const;
