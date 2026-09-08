export function spriteSquash(distance: number | undefined, reducedMotion: boolean, perk = 0) {
  const walk = distance === undefined ? 0 : -Math.sin(distance / .42 * Math.PI * 4) * .045;
  const y = reducedMotion ? 1 : 1 + walk + perk;
  const width = 1 / Math.sqrt(y);
  return { x: width, y, z: width, lift: .13 * (1 - y) };
}
