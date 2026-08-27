import { PIP_DIRECT_GREET_MESSAGE, PIP_PET_MESSAGE, type PipInteractionPhase } from './pipInteraction';

export function pipInteractionStatusText(
  phase: PipInteractionPhase,
  placementMessage: string | null,
  pipMessage: string | null,
): string | null {
  if (phase === 'greet') return PIP_DIRECT_GREET_MESSAGE;
  if (phase === 'pet') return PIP_PET_MESSAGE;
  if (phase === 'eating') return 'Pip takes a few pleased bites, listening ear bobbing.';
  if (phase === 'playing') return 'Pip trots over and gives the wooden rings one careful nudge.';
  return placementMessage ?? pipMessage;
}

export function pipLiveRegionLabel(message: string | null): string | null {
  return message ? `Pip: ${message}` : null;
}
