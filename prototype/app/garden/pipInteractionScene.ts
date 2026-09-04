import {
  interactionReducer,
  type InteractionActivationEvent,
  type InteractionState,
  type InteractableId,
} from './interaction';
import type { MemoryKind } from './journey';
import {
  GARDEN_OBSTACLES,
  nearestSafePoint,
  type GardenPoint,
} from './navigation';
import {
  PIP_DIRECT_GREET_REACTION_SECONDS,
  PIP_EATING_REACTION_SECONDS,
  PIP_PLAYING_REACTION_SECONDS,
  type PipInteractionPhase,
} from './pipInteraction';
import {
  GARDEN_SNACK_AUTHORED_POSITION,
  GARDEN_TOY_AUTHORED_POSITION,
  resetGardenObjectPosition,
  type GardenObjectId,
} from './GardenObjects';

export type GardenObjectPositions = Record<GardenObjectId, readonly [number, number, number]>;

export type PipInteractionSceneState = {
  interaction: InteractionState;
  phase: PipInteractionPhase;
  placedPosition: GardenPoint | null;
  placementMessage: string | null;
  resumeSequence: number;
  focusRepublishSequence: number;
  objectPositions: GardenObjectPositions;
  objectLastSafePositions: GardenObjectPositions;
  reactionStarted: boolean;
  greetingArrived: boolean;
  toyNudged: boolean;
  completedMemory: { kind: MemoryKind; sequence: number } | null;
};

export type PipInteractionSceneEvent =
  | { type: 'focus'; target: InteractableId | null }
  | { type: 'activate'; event: InteractionActivationEvent }
  | { type: 'greet-arrived' }
  | { type: 'greet-complete' }
  | { type: 'pet-complete' }
  | { type: 'place-pip'; point: GardenPoint; message: string | null }
  | { type: 'placed-complete' }
  | { type: 'place-object'; target: GardenObjectId; point: GardenPoint; message: string | null }
  | { type: 'offer-object'; target: GardenObjectId; reactionPoint: GardenPoint; pipAvailable: boolean }
  | { type: 'toy-nudged' }
  | { type: 'object-reaction-complete' };

export function createPipInteractionSceneState(): PipInteractionSceneState {
  const foodRecovery = nearestSafePoint(
    { x: GARDEN_SNACK_AUTHORED_POSITION[0], z: GARDEN_SNACK_AUTHORED_POSITION[2] },
    GARDEN_OBSTACLES,
  );
  const toyRecovery = nearestSafePoint(
    { x: GARDEN_TOY_AUTHORED_POSITION[0], z: GARDEN_TOY_AUTHORED_POSITION[2] },
    GARDEN_OBSTACLES,
  );
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
    focusRepublishSequence: 0,
    objectPositions: {
      food: [...GARDEN_SNACK_AUTHORED_POSITION],
      toy: [...GARDEN_TOY_AUTHORED_POSITION],
    },
    objectLastSafePositions: {
      food: [foodRecovery.x, GARDEN_SNACK_AUTHORED_POSITION[1], foodRecovery.z],
      toy: [toyRecovery.x, GARDEN_TOY_AUTHORED_POSITION[1], toyRecovery.z],
    },
    reactionStarted: false,
    greetingArrived: false,
    toyNudged: false,
    completedMemory: null,
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
      const phase = event.event.type === 'greet'
        ? 'greet-approach'
        : event.event.type === 'pet'
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
        greetingArrived: false,
        ...(event.event.type === 'pick-up' && event.event.target !== 'pip'
          ? {
              objectLastSafePositions: {
                ...state.objectLastSafePositions,
                [event.event.target]: [...event.event.safePosition],
              },
            }
          : {}),
      };
    }
    case 'greet-arrived': {
      if (state.phase !== 'greet-approach') return state;
      return {
        ...state,
        phase: 'greet',
        greetingArrived: true,
      };
    }
    case 'greet-complete': {
      if (state.phase !== 'greet' || !state.greetingArrived) return state;
      return {
        ...state,
        interaction: interactionReducer(state.interaction, { type: 'reaction-complete' }),
        phase: 'none',
        greetingArrived: false,
        resumeSequence: state.resumeSequence + 1,
      };
    }
    case 'pet-complete': {
      if (state.phase !== 'pet') return state;
      return {
        ...state,
        interaction: interactionReducer(state.interaction, { type: 'reaction-complete' }),
        phase: 'none',
        completedMemory: { kind: 'pet', sequence: (state.completedMemory?.sequence ?? 0) + 1 },
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
        focusRepublishSequence: state.focusRepublishSequence + 1,
      };
    }
    case 'placed-complete':
      if (state.phase !== 'placed') return state;
      return {
        ...state,
        phase: 'none',
        resumeSequence: state.resumeSequence + 1,
      };
    case 'place-object': {
      if (
        state.interaction.mode !== 'carrying' ||
        state.interaction.held !== event.target
      ) return state;
      const y = event.target === 'food'
        ? GARDEN_SNACK_AUTHORED_POSITION[1]
        : GARDEN_TOY_AUTHORED_POSITION[1];
      const position = [event.point.x, y, event.point.z] as const;
      return {
        ...state,
        interaction: interactionReducer(state.interaction, { type: 'place', position }),
        phase: 'none',
        placementMessage: event.message,
        objectPositions: { ...state.objectPositions, [event.target]: position },
        objectLastSafePositions: { ...state.objectLastSafePositions, [event.target]: position },
        focusRepublishSequence: state.focusRepublishSequence + 1,
      };
    }
    case 'offer-object': {
      const interaction = interactionReducer(state.interaction, {
        type: 'offer',
        target: event.target,
        pipAvailable: event.pipAvailable,
      });
      if (interaction === state.interaction) return state;
      const y = event.target === 'food'
        ? GARDEN_SNACK_AUTHORED_POSITION[1]
        : GARDEN_TOY_AUTHORED_POSITION[1];
      return {
        ...state,
        interaction,
        phase: event.target === 'food' ? 'eating' : 'playing',
        objectPositions: {
          ...state.objectPositions,
          [event.target]: [event.reactionPoint.x, y, event.reactionPoint.z],
        },
        placementMessage: null,
        reactionStarted: true,
        toyNudged: false,
      };
    }
    case 'toy-nudged':
      if (state.phase !== 'playing' || state.toyNudged) return state;
      return { ...state, toyNudged: true };
    case 'object-reaction-complete': {
      if (
        (state.phase !== 'eating' && state.phase !== 'playing') ||
        (state.phase === 'playing' && !state.toyNudged) ||
        state.interaction.mode !== 'reacting' ||
        state.interaction.offered === null
      ) return state;
      const offered = state.interaction.offered;
      const resetPosition = resetGardenObjectPosition(
        offered,
        state.objectLastSafePositions[offered],
      );
      return {
        ...state,
        interaction: interactionReducer(state.interaction, { type: 'reaction-complete' }),
        phase: 'none',
        completedMemory: { kind: offered === 'food' ? 'snack' : 'toy', sequence: (state.completedMemory?.sequence ?? 0) + 1 },
        objectPositions: { ...state.objectPositions, [offered]: resetPosition },
        reactionStarted: false,
        toyNudged: false,
        resumeSequence: state.resumeSequence + 1,
        focusRepublishSequence: state.focusRepublishSequence + 1,
      };
    }
  }
}

export function scheduleObjectReactionCompletion<Handle>(
  state: PipInteractionSceneState,
  dispatch: (event: PipInteractionSceneEvent) => void,
  schedule: (callback: () => void, delayMs: number) => Handle,
  cancel: (handle: Handle) => void,
): () => void {
  const delayMs = state.phase === 'eating'
    ? PIP_EATING_REACTION_SECONDS * 1000
    : state.phase === 'playing' && state.toyNudged
      ? PIP_PLAYING_REACTION_SECONDS * 1000
      : null;
  if (delayMs === null) return () => {};
  return schedulePipSceneEvent(
    dispatch,
    { type: 'object-reaction-complete' },
    delayMs,
    schedule,
    cancel,
  );
}

export function scheduleDirectGreetingCompletion<Handle>(
  state: PipInteractionSceneState,
  dispatch: (event: PipInteractionSceneEvent) => void,
  schedule: (callback: () => void, delayMs: number) => Handle,
  cancel: (handle: Handle) => void,
): () => void {
  if (state.phase !== 'greet' || !state.greetingArrived) return () => {};
  return schedulePipSceneEvent(
    dispatch,
    { type: 'greet-complete' },
    PIP_DIRECT_GREET_REACTION_SECONDS * 1000,
    schedule,
    cancel,
  );
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
