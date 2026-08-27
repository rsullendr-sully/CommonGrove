import { describe, expect, it } from 'vitest';
import { getPipPose } from './pipPose';

describe('Pip pose', () => {
  it('alternates feet from distance travelled', () => {
    const first = getPipPose({ speed: 1, distanceTravelled: 0.1, attentive: false, reducedMotion: false });
    const second = getPipPose({ speed: 1, distanceTravelled: 0.55, attentive: false, reducedMotion: false });
    expect(Math.sign(first.leftLeg)).not.toBe(Math.sign(second.leftLeg));
    expect(first.leftLeg).toBeCloseTo(-first.rightLeg, 5);
  });

  it('removes secondary bounce in reduced motion', () => {
    const pose = getPipPose({ speed: 1, distanceTravelled: 0.3, attentive: false, reducedMotion: true });
    expect(pose.bodyLift).toBe(0);
    expect(pose.earSway).toBe(0);
  });
});
