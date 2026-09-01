import { describe, expect, it } from 'vitest';
import { getRewardRevealFrame } from './rewardReveal';

describe('reward reveal presentation', () => {
  it('keeps hidden rewards below the garden surface without residual light', () => {
    expect(getRewardRevealFrame({
      elapsedSeconds: 4,
      visible: false,
      reducedMotion: false,
      profile: 'flower',
    })).toEqual({
      growth: 0,
      scale: 0.035,
      scaleY: 0.02,
      rise: -0.2,
      opacity: 0,
      aura: 0,
      glowBoost: 1,
    });
  });

  it('grows rewards through a readable rise instead of a uniform pop', () => {
    const early = getRewardRevealFrame({
      elapsedSeconds: 0.28,
      visible: true,
      reducedMotion: false,
      profile: 'seed',
    });
    const settled = getRewardRevealFrame({
      elapsedSeconds: 2,
      visible: true,
      reducedMotion: false,
      profile: 'seed',
    });

    expect(early.growth).toBeGreaterThan(0);
    expect(early.growth).toBeLessThan(0.5);
    expect(early.scaleY).toBeGreaterThan(early.scale);
    expect(early.rise).toBeLessThan(0);
    expect(early.aura).toBeGreaterThan(0);
    expect(settled).toMatchObject({ growth: 1, scale: 1, scaleY: 1, rise: 0, opacity: 1 });
    expect(settled.aura).toBe(0);
  });

  it('stagger-delays later flower clusters while the first cluster is already opening', () => {
    const first = getRewardRevealFrame({
      elapsedSeconds: 0.32,
      visible: true,
      reducedMotion: false,
      profile: 'flower',
      delaySeconds: 0,
    });
    const later = getRewardRevealFrame({
      elapsedSeconds: 0.32,
      visible: true,
      reducedMotion: false,
      profile: 'flower',
      delaySeconds: 0.26,
    });

    expect(first.growth).toBeGreaterThan(later.growth);
    expect(first.opacity).toBeGreaterThan(later.opacity);
  });

  it('uses an immediate stable end state when reduced motion is requested', () => {
    expect(getRewardRevealFrame({
      elapsedSeconds: 0,
      visible: true,
      reducedMotion: true,
      profile: 'structure',
    })).toEqual({
      growth: 1,
      scale: 1,
      scaleY: 1,
      rise: 0,
      opacity: 1,
      aura: 0,
      glowBoost: 1,
    });
  });
});
