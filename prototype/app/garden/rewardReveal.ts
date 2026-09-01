export type RewardRevealProfile = 'flower' | 'structure' | 'seed' | 'destination';

export type RewardRevealFrame = Readonly<{
  growth: number;
  scale: number;
  scaleY: number;
  rise: number;
  opacity: number;
  aura: number;
  glowBoost: number;
}>;

const HIDDEN_FRAME: RewardRevealFrame = {
  growth: 0,
  scale: 0.035,
  scaleY: 0.02,
  rise: -0.2,
  opacity: 0,
  aura: 0,
  glowBoost: 1,
};

const SETTLED_FRAME: RewardRevealFrame = {
  growth: 1,
  scale: 1,
  scaleY: 1,
  rise: 0,
  opacity: 1,
  aura: 0,
  glowBoost: 1,
};

const PROFILE_TIMING = {
  flower: { duration: 0.92, rise: 0.18, overshoot: 1.65, stretch: 0.24 },
  structure: { duration: 1.45, rise: 0.3, overshoot: 1.18, stretch: 0.12 },
  seed: { duration: 1.15, rise: 0.34, overshoot: 1.42, stretch: 0.2 },
  destination: { duration: 1.75, rise: 0.42, overshoot: 1.15, stretch: 0.1 },
} as const satisfies Record<RewardRevealProfile, {
  duration: number;
  rise: number;
  overshoot: number;
  stretch: number;
}>;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function easeOutBack(value: number, overshoot: number) {
  const shifted = value - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
}

export function getRewardRevealFrame(input: {
  elapsedSeconds: number;
  visible: boolean;
  reducedMotion: boolean;
  profile: RewardRevealProfile;
  delaySeconds?: number;
}): RewardRevealFrame {
  if (!input.visible) return HIDDEN_FRAME;
  if (input.reducedMotion) return SETTLED_FRAME;

  const timing = PROFILE_TIMING[input.profile];
  const localSeconds = Math.max(0, input.elapsedSeconds - (input.delaySeconds ?? 0));
  if (localSeconds >= timing.duration) return SETTLED_FRAME;

  const linear = clamp01(localSeconds / timing.duration);
  const growth = smoothstep(linear);
  const auraPhase = clamp01(localSeconds / (timing.duration * 0.84));
  const aura = Math.sin(auraPhase * Math.PI) * (1 - growth * 0.3);
  const scale = 0.035 + easeOutBack(growth, timing.overshoot) * 0.965;

  return {
    growth,
    scale,
    scaleY: scale + aura * timing.stretch * (1 - growth),
    rise: -timing.rise * (1 - growth),
    opacity: smoothstep(localSeconds / (timing.duration * 0.48)),
    aura,
    glowBoost: 1 + aura * 0.65,
  };
}
