export type PlanarMovementVector = {
  x: number;
  z: number;
};

export function getFirstPersonMovementVector(
  yaw: number,
  forwardAmount: number,
  sideAmount: number,
): PlanarMovementVector {
  const inputLength = Math.hypot(forwardAmount, sideAmount) || 1;
  const normalizedForward = forwardAmount / inputLength;
  const normalizedSide = sideAmount / inputLength;

  return {
    x: -Math.sin(yaw) * normalizedForward + Math.cos(yaw) * normalizedSide,
    z: -Math.cos(yaw) * normalizedForward - Math.sin(yaw) * normalizedSide,
  };
}
