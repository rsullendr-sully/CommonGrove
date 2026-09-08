import { describe, expect, it } from 'vitest';
import { createCliffGeometry, createPavilionRoofGeometry, createTreeCrown, createSanctuarySkyGeometry } from './sanctuaryGeometry';

describe('crafted sanctuary geometry', () => {
  it('keeps the sky inside the 120 m camera far plane from every garden corner', () => {
    const sky = createSanctuarySkyGeometry();
    sky.computeBoundingSphere();
    expect(sky.boundingSphere!.radius + Math.hypot(20, 20, 5)).toBeLessThan(120);
    expect(sky.boundingSphere!.radius).toBeGreaterThan(60);
    sky.dispose();
  });

  it('sculpts repeatable rounded cliff blocks without invalid or excessive geometry', () => {
    const a = createCliffGeometry(7);
    const b = createCliffGeometry(7);
    const c = createCliffGeometry(8);
    expect(a.getAttribute('position').array).toEqual(b.getAttribute('position').array);
    expect(a.getAttribute('position').array).not.toEqual(c.getAttribute('position').array);
    expect(a.getAttribute('position').count).toBeLessThan(6000);
    expect([...a.getAttribute('position').array].every(Number.isFinite)).toBe(true);
    a.computeBoundingBox();
    expect(a.boundingBox!.min.y).toBeGreaterThan(-0.6);
    expect(a.boundingBox!.max.y).toBeLessThan(0.6);
    [a, b, c].forEach((geometry) => geometry.dispose());
  });

  it('gives the pavilion a broad curved roof with upward normals and bounded eaves', () => {
    const roof = createPavilionRoofGeometry();
    roof.computeBoundingBox();
    expect(roof.boundingBox!.min.x).toBeCloseTo(-3.15);
    expect(roof.boundingBox!.max.x).toBeCloseTo(3.15);
    expect(roof.boundingBox!.min.y).toBeGreaterThan(3.5);
    expect(roof.boundingBox!.max.y).toBeLessThan(5.1);
    const normal = roof.getAttribute('normal');
    for (let i = 0; i < normal.count; i++) expect(normal.getY(i)).toBeGreaterThan(0);
    roof.dispose();
  });

  it('grows deterministic leafy branch crowns clear of walking height', () => {
    const crown = createTreeCrown(13);
    expect(crown).toEqual(createTreeCrown(13));
    expect(crown.leaves.length).toBeGreaterThan(1500);
    expect(crown.leaves.length).toBeLessThan(4000);
    expect(crown.branches.length).toBeGreaterThan(12);
    for (const leaf of crown.leaves) {
      expect(leaf.position[1]).toBeGreaterThan(2.5);
      expect(leaf.position.every(Number.isFinite)).toBe(true);
    }
  });
});
