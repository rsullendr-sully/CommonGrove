import { describe, expect, it } from 'vitest';
import { PAVILION_OBSTACLES, PAVILION_READING_POINT, PAVILION_SURFACE } from './pavilionLayout';

describe('pavilion layout', () => {
  it('keeps the reading point clear of every pavilion structure', () => {
    for (const obstacle of PAVILION_OBSTACLES) {
      expect(Math.hypot(
        PAVILION_READING_POINT.x - obstacle.x,
        PAVILION_READING_POINT.z - obstacle.z,
      )).toBeGreaterThanOrEqual(obstacle.radius + 0.35);
    }
  });

  it('uses a shallow deck reached by four small visual rises', () => {
    const stepTops = PAVILION_SURFACE.approachSteps.map(({ centerY, height }) => centerY + height / 2);
    const deckTop = PAVILION_SURFACE.deck.centerY + PAVILION_SURFACE.deck.height / 2;
    expect(stepTops).toEqual([0.04, 0.08, 0.12, 0.16]);
    expect(deckTop).toBe(0.16);
    for (const rise of stepTops.map((top, index) => top - (stepTops[index - 1] ?? 0))) {
      expect(rise).toBeCloseTo(0.04, 8);
    }
  });
});
