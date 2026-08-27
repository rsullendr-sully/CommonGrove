export type InteractableId = 'pip' | 'food' | 'toy';

export type SafePosition = readonly [number, number, number];

export type InteractionState =
  | {
      mode: 'idle';
      focused: InteractableId | null;
      held: null;
      lastSafePosition: SafePosition | null;
    }
  | {
      mode: 'reacting';
      focused: InteractableId | null;
      held: null;
      lastSafePosition: SafePosition | null;
    }
  | {
      mode: 'carrying';
      focused: null;
      held: InteractableId;
      lastSafePosition: SafePosition | null;
    };

export type InteractionEvent =
  | { type: 'focus'; target: InteractableId | null }
  | { type: 'pet' }
  | { type: 'reaction-complete' }
  | { type: 'pick-up'; target: InteractableId; safePosition: SafePosition }
  | { type: 'place'; position: SafePosition }
  | { type: 'cancel' };

function copyPosition(position: SafePosition): SafePosition {
  return [position[0], position[1], position[2]];
}

function assertNever(value: never): never {
  throw new Error(`Unhandled interaction event: ${JSON.stringify(value)}`);
}

export function interactionReducer(state: InteractionState, event: InteractionEvent): InteractionState {
  switch (event.type) {
    case 'focus':
      if (state.mode === 'carrying') return state;
      return { ...state, focused: event.target };

    case 'pet':
      if (state.mode !== 'idle' || state.focused !== 'pip') return state;
      return {
        mode: 'reacting',
        focused: null,
        held: null,
        lastSafePosition: state.lastSafePosition,
      };

    case 'reaction-complete':
      if (state.mode !== 'reacting') return state;
      return {
        mode: 'idle',
        focused: null,
        held: null,
        lastSafePosition: state.lastSafePosition,
      };

    case 'pick-up':
      if (state.mode !== 'idle' || state.focused !== event.target) return state;
      return {
        mode: 'carrying',
        focused: null,
        held: event.target,
        lastSafePosition: copyPosition(event.safePosition),
      };

    case 'place':
      if (state.mode !== 'carrying') return state;
      return {
        mode: 'idle',
        focused: null,
        held: null,
        lastSafePosition: copyPosition(event.position),
      };

    case 'cancel':
      if (state.mode !== 'carrying') return state;
      return {
        mode: 'idle',
        focused: null,
        held: null,
        lastSafePosition: state.lastSafePosition,
      };

    default:
      return assertNever(event);
  }
}

export function actionLabelFor(state: InteractionState): string | null {
  if (state.mode === 'carrying') {
    switch (state.held) {
      case 'pip':
        return 'Place Pip';
      case 'food':
        return 'Place snack';
      case 'toy':
        return 'Place toy';
    }
  }

  if (state.mode !== 'idle') return null;

  switch (state.focused) {
    case 'pip':
      return 'Pet Pip';
    case 'food':
      return 'Pick up snack';
    case 'toy':
      return 'Pick up toy';
    case null:
      return null;
  }
}
