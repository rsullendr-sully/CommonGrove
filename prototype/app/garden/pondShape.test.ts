import { describe, expect, it } from 'vitest';
import { createPondOutline } from './pondShape';

describe('organic pond outline', () => {
  it('is deterministic, centered, and bounded', () => {
    const points = createPondOutline(6.15, 0.18, 64, 0.7);

    expect(createPondOutline(6.15, 0.18, 64, 0.7)).toEqual(points);
    expect(points).toHaveLength(64);
    for (const point of points) {
      const radius = Math.hypot(point.x, point.z);
      expect(radius).toBeGreaterThanOrEqual(5.97);
      expect(radius).toBeLessThanOrEqual(6.33);
    }
  });

  it('keeps the visual bank inside the existing collision radius', () => {
    const bank = createPondOutline(6.35, 0.2, 64, 1.2);

    expect(Math.max(...bank.map((point) => Math.hypot(point.x, point.z)))).toBeLessThan(6.7);
  });
});
