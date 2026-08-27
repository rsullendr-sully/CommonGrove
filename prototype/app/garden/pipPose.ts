export type PipPoseInput = {
  poseKind: 'idle' | 'walk' | 'inspect' | 'rest' | 'greet';
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
  headTilt: number;
  listeningEarLift: number;
};

export function getPipPose(input: PipPoseInput): PipPose {
  const stride = Math.sin(input.distanceTravelled * Math.PI * 3.5);
  const weight = input.poseKind === 'walk' ? Math.min(1, input.speed / 1.2) : 0;

  return {
    leftLeg: weight ? stride * 0.48 * weight : 0,
    rightLeg: weight ? -stride * 0.48 * weight : 0,
    leftArm: weight ? -stride * 0.2 * weight : 0,
    rightArm: weight ? stride * 0.2 * weight : 0,
    bodyLift: input.poseKind === 'rest' ? -0.12 : input.reducedMotion ? 0 : Math.abs(stride) * 0.025 * weight,
    bodyLean: input.poseKind === 'walk' && !input.reducedMotion ? input.speed * 0.035 : 0,
    earSway: input.reducedMotion ? 0 : stride * 0.045 * weight + (input.attentive ? 0.08 : 0),
    headTilt: input.poseKind === 'inspect' ? 0.16 : 0,
    listeningEarLift: input.poseKind === 'greet' ? 0.12 : 0,
  };
}
