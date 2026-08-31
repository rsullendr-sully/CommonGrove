export type PondOutlinePoint = Readonly<{
  x: number;
  z: number;
}>;

export function createPondOutline(
  baseRadius: number,
  variation: number,
  segments = 64,
  phase = 0,
): PondOutlinePoint[] {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    const offset = variation * (
      0.58 * Math.sin(angle * 5 + phase)
      + 0.42 * Math.sin(angle * 9 - phase * 0.7)
    );
    const radius = baseRadius + offset;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    };
  });
}
