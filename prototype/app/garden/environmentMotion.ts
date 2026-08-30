export type PondMotionFrame = Readonly<{
  rippleRotation: number;
  highlightOffset: number;
  glowPulse: number;
}>;

export type AtmosphereMotionFrame = Readonly<{
  moteDriftX: number;
  moteDriftY: number;
  cloudDriftX: number;
  moteOpacity: number;
}>;

type WritablePondMotionFrame = {
  -readonly [Key in keyof PondMotionFrame]: PondMotionFrame[Key];
};

type WritableAtmosphereMotionFrame = {
  -readonly [Key in keyof AtmosphereMotionFrame]: AtmosphereMotionFrame[Key];
};

export function getAtmosphereMotionFrame(
  elapsedSeconds: number,
  motionEnabled: boolean,
): AtmosphereMotionFrame;
export function getAtmosphereMotionFrame(
  elapsedSeconds: number,
  motionEnabled: boolean,
  target: WritableAtmosphereMotionFrame,
): AtmosphereMotionFrame;
export function getAtmosphereMotionFrame(
  elapsedSeconds: number,
  motionEnabled: boolean,
  target?: WritableAtmosphereMotionFrame,
): AtmosphereMotionFrame {
  const frame = target ?? {
    moteDriftX: 0,
    moteDriftY: 0,
    cloudDriftX: 0,
    moteOpacity: 1,
  };
  if (!motionEnabled) {
    frame.moteDriftX = 0;
    frame.moteDriftY = 0;
    frame.cloudDriftX = 0;
    frame.moteOpacity = 1;
    return frame;
  }
  frame.moteDriftX = Math.sin(elapsedSeconds * 0.23) * 0.18;
  frame.moteDriftY = Math.sin(elapsedSeconds * 0.41) * 0.12;
  frame.cloudDriftX = Math.sin(elapsedSeconds * 0.035) * 1.2;
  frame.moteOpacity = 0.82 + Math.sin(elapsedSeconds * 0.7) * 0.12;
  return frame;
}

export function getPondMotionFrame(
  elapsedSeconds: number,
  motionEnabled: boolean,
): PondMotionFrame;
export function getPondMotionFrame(
  elapsedSeconds: number,
  motionEnabled: boolean,
  target: WritablePondMotionFrame,
): PondMotionFrame;
export function getPondMotionFrame(
  elapsedSeconds: number,
  motionEnabled: boolean,
  target?: WritablePondMotionFrame,
): PondMotionFrame {
  const frame = target ?? {
    rippleRotation: 0,
    highlightOffset: 0,
    glowPulse: 1,
  };
  if (!motionEnabled) {
    frame.rippleRotation = 0;
    frame.highlightOffset = 0;
    frame.glowPulse = 1;
    return frame;
  }
  frame.rippleRotation = (elapsedSeconds * 0.045) % (Math.PI * 2);
  frame.highlightOffset = Math.sin(elapsedSeconds * 0.38) * 0.08;
  frame.glowPulse = 1 + Math.sin(elapsedSeconds * 0.8) * 0.08;
  return frame;
}
