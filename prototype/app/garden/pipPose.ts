export type PipPoseInput = {
  speed: number;
  distanceTravelled: number;
  attentive: boolean;
  reducedMotion: boolean;
};

export type PipPose = {
  leftLeg: number;
  rightLeg: number;
  leftArm: number;
  rightArm: number;
  bodyLift: number;
  bodyLean: number;
  earSway: number;
};

export function getPipPose(input: PipPoseInput): PipPose {
  const stride = Math.sin(input.distanceTravelled * Math.PI * 3.5);
  const weight = Math.min(1, input.speed / 1.2);

  return {
    leftLeg: stride * 0.48 * weight,
    rightLeg: -stride * 0.48 * weight,
    leftArm: -stride * 0.2 * weight,
    rightArm: stride * 0.2 * weight,
    bodyLift: input.reducedMotion ? 0 : Math.abs(stride) * 0.025 * weight,
    bodyLean: input.speed * 0.035,
    earSway: input.reducedMotion ? 0 : stride * 0.045 * weight + (input.attentive ? 0.08 : 0),
  };
}
