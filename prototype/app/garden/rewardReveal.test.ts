import { describe, expect, it } from 'vitest';
import {
  advanceRewardRevealPlayback,
  getRewardAuraPresentation,
  getRewardRevealFrame,
  INITIAL_REWARD_REVEAL_PLAYBACK,
} from './rewardReveal';

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

  it('keeps a visible reward settled after reduced motion is turned back off', () => {
    const started = advanceRewardRevealPlayback(INITIAL_REWARD_REVEAL_PLAYBACK, {
      visible: true,
      reducedMotion: false,
      deltaSeconds: 0.2,
    });
    const reduced = advanceRewardRevealPlayback(started, {
      visible: true,
      reducedMotion: true,
      deltaSeconds: 0.1,
    });
    const restored = advanceRewardRevealPlayback(reduced, {
      visible: true,
      reducedMotion: false,
      deltaSeconds: 0.1,
    });

    expect(reduced.completed).toBe(true);
    expect(restored.completed).toBe(true);
    expect(getRewardRevealFrame({
      elapsedSeconds: restored.elapsedSeconds,
      visible: true,
      reducedMotion: restored.completed,
      profile: 'seed',
    }).growth).toBe(1);
  });

  it('resets completed playback only after a reward is hidden and revealed again', () => {
    const completed = advanceRewardRevealPlayback(INITIAL_REWARD_REVEAL_PLAYBACK, {
      visible: true,
      reducedMotion: true,
      deltaSeconds: 0,
    });
    const hidden = advanceRewardRevealPlayback(completed, {
      visible: false,
      reducedMotion: false,
      deltaSeconds: 0.1,
    });
    const revealedAgain = advanceRewardRevealPlayback(hidden, {
      visible: true,
      reducedMotion: false,
      deltaSeconds: 0.1,
    });

    expect(hidden).toEqual(INITIAL_REWARD_REVEAL_PLAYBACK);
    expect(revealedAgain.completed).toBe(false);
    expect(revealedAgain.elapsedSeconds).toBeGreaterThan(0);
  });

  it('fully culls aura motes and motion once a reveal settles', () => {
    const active = getRewardAuraPresentation(getRewardRevealFrame({
      elapsedSeconds: 0.3,
      visible: true,
      reducedMotion: false,
      profile: 'flower',
    }));
    const settled = getRewardAuraPresentation(getRewardRevealFrame({
      elapsedSeconds: 2,
      visible: true,
      reducedMotion: false,
      profile: 'flower',
    }));

    expect(active.visible).toBe(true);
    expect(active.moteOpacity).toBeGreaterThan(0);
    expect(settled).toEqual({ visible: false, moteOpacity: 0, rotationEnabled: false });
  });

  it('latches natural completion and reuses the settled playback state', () => {
    const completed = advanceRewardRevealPlayback(INITIAL_REWARD_REVEAL_PLAYBACK, {
      visible: true,
      reducedMotion: false,
      deltaSeconds: 0.5,
      settleAfterSeconds: 0.05,
    });
    const nextFrame = advanceRewardRevealPlayback(completed, {
      visible: true,
      reducedMotion: false,
      deltaSeconds: 0.5,
      settleAfterSeconds: 0.05,
    });

    expect(completed.completed).toBe(true);
    expect(nextFrame).toBe(completed);
  });
});
