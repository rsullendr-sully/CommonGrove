import type { PipPoseInput } from './pipPose';

// Presentation-only timing: never changes navigation, interaction credit or mood.
export function characterActing(activity: PipPoseInput['poseKind'], elapsed: number, age: number, phase: number, reducedMotion: boolean) {
  const t = Math.max(0, elapsed);
  const blinkTime = ((t + phase) % 4.7);
  const blink = reducedMotion ? 1 : blinkTime < .18 ? 1 - Math.sin(blinkTime / .18 * Math.PI) : 1;
  const eyesClosed = activity === 'pet' || activity === 'rest';
  const curious = activity === 'inspect';
  const greeting = activity === 'greet';
  const gesture = greeting && age < 2.2;
  const moving = activity === 'walk';
  return {
    eyeOpen: eyesClosed ? 0 : blink,
    glance: reducedMotion || !curious ? 0 : Math.sin(t * .8 + phase) * .008,
    headTurn: reducedMotion || !curious ? 0 : Math.sin(t * .8 + phase) * .075,
    perk: reducedMotion || !gesture ? 0 : Math.sin(Math.max(0, age) / 2.2 * Math.PI) ** 2 * .045,
    breathe: reducedMotion || moving || activity === 'carried' ? 0 : Math.sin(t * 1.7 + phase) * .004,
    iconVisible: (activity === 'pet' || activity === 'greet' || activity === 'playing' || activity === 'eating') && age < 2.2,
  };
}
