import {
  interactionReducer,
  type InteractionEvent,
  type InteractionState,
  type InteractableId,
} from './interaction';
import type { GardenPoint } from './navigation';
import type { PipInteractionPhase } from './pipInteraction';

export type PipInteractionSceneState = {
  interaction: InteractionState;
  phase: PipInteractionPhase;
  placedPosition: GardenPoint | null;
  placementMessage: string | null;
  resumeSequence: number;
};

type PipSceneActivationEvent = Extract<InteractionEvent, { type: 'pet' | 'pick-up' }>;

export type PipInteractionSceneEvent =
  | { type: 'focus'; target: InteractableId | null }
  | { type: 'activate'; event: PipSceneActivationEvent }
  | { type: 'pet-complete' }
  | { type: 'place-pip'; point: GardenPoint; message: string | null }
  | { type: 'placed-complete' };

export function createPipInteractionSceneState(): PipInteractionSceneState {
  return {
    interaction: {
      mode: 'idle',
      focused: null,
      held: null,
      lastSafePosition: null,
    },
    phase: 'none',
    placedPosition: null,
    placementMessage: null,
    resumeSequence: 0,
  };
}

export function pipInteractionSceneReducer(
  state: PipInteractionSceneState,
  event: PipInteractionSceneEvent,
): PipInteractionSceneState {
  switch (event.type) {
    case 'focus': {
      const interaction = interactionReducer(state.interaction, event);
      return interaction === state.interaction ? state : { ...state, interaction };
    }
    case 'activate': {
      const interaction = interactionReducer(state.interaction, event.event);
      if (interaction === state.interaction) return state;
      const phase = event.event.type === 'pet'
        ? 'pet'
        : event.event.type === 'pick-up' && event.event.target === 'pip'
          ? 'carried'
          : state.phase;
      return {
        ...state,
        interaction,
        phase,
        placedPosition: phase === 'carried' ? null : state.placedPosition,
        placementMessage: null,
      };
    }
    case 'pet-complete': {
      if (state.phase !== 'pet') return state;
      return {
        ...state,
        interaction: interactionReducer(state.interaction, { type: 'reaction-complete' }),
        phase: 'none',
        resumeSequence: state.resumeSequence + 1,
      };
    }
    case 'place-pip': {
      if (state.phase !== 'carried' || state.interaction.mode !== 'carrying' || state.interaction.held !== 'pip') return state;
      return {
        ...state,
        interaction: interactionReducer(state.interaction, {
          type: 'place',
          position: [event.point.x, 0, event.point.z],
        }),
        phase: 'placed',
        placedPosition: { ...event.point },
        placementMessage: event.message,
      };
    }
    case 'placed-complete':
      if (state.phase !== 'placed') return state;
      return {
        ...state,
        phase: 'none',
        resumeSequence: state.resumeSequence + 1,
      };
  }
}

export function eligibleInteractionTarget(
  target: InteractableId | null,
  priorityMissionActive: boolean,
): InteractableId | null {
  return priorityMissionActive && target === 'pip' ? null : target;
}

export function consumePipResumeSequence(
  consumedSequence: number,
  currentSequence: number,
  resume: () => void,
): number {
  if (currentSequence === consumedSequence) return consumedSequence;
  resume();
  return currentSequence;
}

export function schedulePipSceneEvent<Handle>(
  dispatch: (event: PipInteractionSceneEvent) => void,
  event: PipInteractionSceneEvent,
  delayMs: number,
  schedule: (callback: () => void, delayMs: number) => Handle,
  cancel: (handle: Handle) => void,
): () => void {
  let active = true;
  const handle = schedule(() => {
    if (active) dispatch(event);
  }, delayMs);
  return () => {
    active = false;
    cancel(handle);
  };
}
