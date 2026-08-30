export type PondMotionFrame = Readonly<{
  rippleRotation: number;
  highlightOffset: number;
  glowPulse: number;
}>;

export function getPondMotionFrame(elapsedSeconds: number, motionEnabled: boolean): PondMotionFrame {
  if (!motionEnabled) return { rippleRotation: 0, highlightOffset: 0, glowPulse: 1 };
  return {
    rippleRotation: (elapsedSeconds * 0.045) % (Math.PI * 2),
    highlightOffset: Math.sin(elapsedSeconds * 0.38) * 0.08,
    glowPulse: 1 + Math.sin(elapsedSeconds * 0.8) * 0.08,
  };
}
