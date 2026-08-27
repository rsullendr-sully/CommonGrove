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
});
