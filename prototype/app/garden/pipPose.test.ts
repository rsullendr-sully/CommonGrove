import { describe, expect, it } from 'vitest';
import { getPipPose } from './pipPose';

describe('Pip pose', () => {
  it('alternates feet from distance travelled', () => {
    const first = getPipPose({ poseKind: 'walk', speed: 1, distanceTravelled: 0.1, attentive: false, reducedMotion: false });
    const second = getPipPose({ poseKind: 'walk', speed: 1, distanceTravelled: 0.55, attentive: false, reducedMotion: false });
    expect(Math.sign(first.leftLeg)).not.toBe(Math.sign(second.leftLeg));
    expect(first.leftLeg).toBeCloseTo(-first.rightLeg, 5);
  });

  it('removes secondary bounce in reduced motion', () => {
    const pose = getPipPose({ poseKind: 'walk', speed: 1, distanceTravelled: 0.3, attentive: false, reducedMotion: true });
    expect(pose.bodyLift).toBe(0);
    expect(pose.earSway).toBe(0);
    expect(pose.bodyLean).toBe(0);
  });

  it('lowers Pip by 0.12 meters for rest without moving the feet', () => {
    const pose = getPipPose({ poseKind: 'rest', speed: 0, distanceTravelled: 2, attentive: false, reducedMotion: false });

    expect(pose.bodyLift).toBe(-0.12);
    expect(pose.leftLeg).toBe(0);
    expect(pose.rightLeg).toBe(0);
  });

  it('tilts Pip’s head by 0.16 radians while inspecting', () => {
    const pose = getPipPose({ poseKind: 'inspect', speed: 0, distanceTravelled: 2, attentive: false, reducedMotion: false });

    expect(pose.headTilt).toBe(0.16);
  });

  it('raises the listening ear for a greeting without moving the feet', () => {
    const pose = getPipPose({ poseKind: 'greet', speed: 0, distanceTravelled: 2, attentive: true, reducedMotion: false });

    expect(pose.listeningEarLift).toBeGreaterThan(0);
    expect(pose.leftLeg).toBe(0);
    expect(pose.rightLeg).toBe(0);
  });

  it('lowers and tips Pip’s head toward the employee while being petted', () => {
    const pose = getPipPose({ poseKind: 'pet', speed: 1, distanceTravelled: 0.3, attentive: true, reducedMotion: false });

    expect(pose.headLower).toBeGreaterThan(0);
    expect(pose.headTilt).toBeGreaterThan(0.16);
    expect(pose.leftLeg).toBe(0);
    expect(pose.rightLeg).toBe(0);
  });

  it('stops the foot cycle and tucks both legs while Pip is carried', () => {
    const pose = getPipPose({ poseKind: 'carried', speed: 2, distanceTravelled: 0.3, attentive: true, reducedMotion: false });

    expect(pose.leftLeg).toBeLessThan(0);
    expect(pose.rightLeg).toBeLessThan(0);
    expect(pose.leftLeg).toBe(pose.rightLeg);
    expect(pose.bodyLift).toBeGreaterThan(0);
  });

  it.each([false, true])('uses a neutral grounded pose immediately after placement (reduced motion: %s)', (reducedMotion) => {
    const pose = getPipPose({ poseKind: 'placed', speed: 2, distanceTravelled: 0.3, attentive: true, reducedMotion });

    expect(pose).toMatchObject({
      leftLeg: 0,
      rightLeg: 0,
      leftArm: 0,
      rightArm: 0,
      bodyLift: 0,
      bodyLean: 0,
      earSway: 0,
      headTilt: 0,
      headLower: 0,
    });
  });

  it('alternates small eating head dips over the three-second reaction', () => {
    const first = getPipPose({ poseKind: 'eating', reactionElapsed: 0.25, speed: 0, distanceTravelled: 0, attentive: true, reducedMotion: false });
    const second = getPipPose({ poseKind: 'eating', reactionElapsed: 0.75, speed: 0, distanceTravelled: 0, attentive: true, reducedMotion: false });

    expect(first.headLower).toBeGreaterThan(0);
    expect(second.headLower).toBeGreaterThan(0);
    expect(first.headTilt).toBeGreaterThan(0);
    expect(second.headTilt).toBeLessThan(0);
    expect(Math.abs(first.headTilt)).toBeLessThanOrEqual(0.14);
    expect(first.mouthOpen).toBeGreaterThan(0);
    expect(first.leftLeg).toBe(0);
  });

  it('uses a grounded play nudge pose without restarting the walking cycle', () => {
    const pose = getPipPose({ poseKind: 'playing', reactionElapsed: 2, speed: 0, distanceTravelled: 3, attentive: true, reducedMotion: false });

    expect(pose.leftLeg).toBe(0);
    expect(pose.rightLeg).toBe(0);
    expect(pose.bodyLean).toBeGreaterThan(0);
    expect(pose.headLower).toBeGreaterThan(0);
  });
});
