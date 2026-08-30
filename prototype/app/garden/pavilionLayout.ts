export const PAVILION_CENTER = { x: -12.2, z: -12.4 } as const;
export const PAVILION_LOCAL_POSTS = [
  { x: -2, z: -2 }, { x: 2, z: -2 },
  { x: -2, z: 2 }, { x: 2, z: 2 },
] as const;
export const PAVILION_LOCAL_BENCHES = [
  { x: -1.9, z: 0.15 }, { x: 1.9, z: 0.15 },
] as const;
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
  ...PAVILION_LOCAL_BENCHES.map(({ x, z }) => localObstacle(x, z, 0.62)),
  localObstacle(-1.05, -1.55, 0.52),
  localObstacle(0, -1.55, 0.52),
  localObstacle(1.05, -1.55, 0.52),
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
