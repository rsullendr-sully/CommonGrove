import { describe, expect, it } from 'vitest';
import { getPondMotionFrame } from './environmentMotion';

describe('enchanted pond motion', () => {
  it('returns bounded calm motion', () => {
    const frame = getPondMotionFrame(12.5, true);
    expect(frame.rippleRotation).toBeGreaterThanOrEqual(0);
    expect(frame.rippleRotation).toBeLessThan(Math.PI * 2);
    expect(frame.highlightOffset).toBeGreaterThanOrEqual(-0.08);
    expect(frame.highlightOffset).toBeLessThanOrEqual(0.08);
    expect(frame.glowPulse).toBeGreaterThanOrEqual(0.92);
    expect(frame.glowPulse).toBeLessThanOrEqual(1.08);
  });

  it('returns the exact static frame for reduced motion', () => {
    expect(getPondMotionFrame(999, false)).toEqual({
      rippleRotation: 0,
      highlightOffset: 0,
      glowPulse: 1,
    });
  });
});
