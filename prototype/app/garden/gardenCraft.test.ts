import { describe, expect, it } from 'vitest';
import * as craft from './gardenCraft';

describe('softly crafted garden geometry', () => {
  it.each([[2, .1, 1], [.32, 3.4, .32], [.25, .6, .32]])('rounds a %s × %s × %s prop without enlarging its collision footprint', (w, h, d) => {
    expect(craft.createSoftBoxGeometry).toBeTypeOf('function');
    const geometry = craft.createSoftBoxGeometry(w, h, d);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.min.x).toBeCloseTo(-w / 2, 5);
    expect(geometry.boundingBox!.max.y).toBeCloseTo(h / 2, 5);
    expect(geometry.boundingBox!.max.z).toBeCloseTo(d / 2, 5);
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    expect(positions.count).toBeLessThan(1600);
    for (let i = 0; i < positions.count; i++) {
      expect(Number.isFinite(normals.getX(i))).toBe(true);
      expect(Math.abs(positions.getX(i))).toBeLessThanOrEqual(w / 2 + .00001);
      expect(Math.abs(positions.getY(i))).toBeLessThanOrEqual(h / 2 + .00001);
      expect(Math.abs(positions.getZ(i))).toBeLessThanOrEqual(d / 2 + .00001);
    }
    // The extreme corner is actually softened, not just subdivided.
    const corner = Array.from({ length: positions.count }, (_, i) =>
      Math.hypot(positions.getX(i) - w / 2, positions.getY(i) - h / 2, positions.getZ(i) - d / 2));
    expect(Math.min(...corner)).toBeGreaterThan(.002);
    geometry.dispose();
  });

  it('models rounded leaves with thickness rather than razor-thin planes', () => {
    expect(craft.createSoftLeafGeometry).toBeTypeOf('function');
    const leaf = craft.createSoftLeafGeometry();
    leaf.computeBoundingBox();
    expect(leaf.boundingBox!.max.x).toBeCloseTo(.55);
    expect(leaf.boundingBox!.min.x).toBeCloseTo(-.55);
    expect(leaf.boundingBox!.max.y - leaf.boundingBox!.min.y).toBeGreaterThan(.1);
    expect(leaf.boundingBox!.max.z).toBeLessThanOrEqual(.26);
    expect(leaf.getAttribute('position').count).toBeLessThan(180);
    leaf.dispose();
  });

  it('keeps a repeatable full garden crown with fewer, softer leaves', () => {
    expect(craft.createSoftGardenCrown).toBeTypeOf('function');
    const crown = craft.createSoftGardenCrown(13);
    expect(crown).toEqual(craft.createSoftGardenCrown(13));
    expect(crown.leaves.length).toBeGreaterThan(700);
    expect(crown.leaves.length).toBeLessThan(1000);
    expect(crown.branches.length).toBe(18);
    for (const leaf of crown.leaves) expect(leaf.position[1]).toBeGreaterThan(2.5);
  });
});
