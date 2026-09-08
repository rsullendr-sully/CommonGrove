import { actionLabelForLiveTarget, type InteractableId, type InteractionActivationEvent } from './interaction';
import { createPipInteractionSceneState, pipInteractionSceneReducer, type PipInteractionSceneEvent, type PipInteractionSceneState } from './pipInteractionScene';
import { isResidentId, residentDefinition, type ResidentId, type ResidentTarget } from './residents';
import type { GardenPoint } from './navigation';
import type { GardenObjectId } from './GardenObjects';
import type { MemoryKind } from './journey';

export type ResidentInteractionState = {
  scene: PipInteractionSceneState;
  focus: ResidentTarget | null;
  activeId: ResidentId;
  epoch: number;
  resumes: Record<ResidentId, number>;
  placements: Partial<Record<ResidentId, GardenPoint>>;
  completedMemory: { id: ResidentId; kind: MemoryKind; sequence: number } | null;
};
export type ResidentInteractionEvent =
  | { type: 'focus'; target: ResidentTarget | null }
  | { type: 'activate'; event: InteractionActivationEvent }
  | { type: 'offer'; id: ResidentId; target: GardenObjectId; point: GardenPoint; available: boolean }
  | { type: 'cancel'; id: ResidentId; epoch: number }
  | { type: 'scene'; id: ResidentId; epoch: number; event: PipInteractionSceneEvent };

export function createResidentInteraction(): ResidentInteractionState {
  return { scene: createPipInteractionSceneState(), focus: null, activeId: 'pip', epoch: 0,
    resumes: { pip: 0, moss: 0, fern: 0 }, placements: {}, completedMemory: null };
}

export function canonicalTarget(target: ResidentTarget | null): InteractableId | null {
  return isResidentId(target) ? 'pip' : target;
}

export function residentPhase(state: ResidentInteractionState, id: ResidentId) {
  return state.activeId === id ? state.scene.phase : 'none';
}

export function residentInteractionReducer(state: ResidentInteractionState, event: ResidentInteractionEvent): ResidentInteractionState {
  if (event.type === 'cancel') {
    if (event.id !== state.activeId || event.epoch !== state.epoch || !['greet-approach', 'playing'].includes(state.scene.phase)) return state;
    const fresh = createPipInteractionSceneState();
    const scene = pipInteractionSceneReducer({ ...state.scene, interaction: fresh.interaction, phase: 'none',
      reactionStarted: false, toyNudged: false, greetingArrived: false, placementMessage: 'The path is busy. We can try again in a moment.',
      focusRepublishSequence: state.scene.focusRepublishSequence + 1 }, { type: 'focus', target: canonicalTarget(state.focus) });
    return { ...state, scene, epoch: state.epoch + 1, resumes: { ...state.resumes, [event.id]: state.resumes[event.id] + 1 } };
  }
  if (event.type === 'focus') {
    if (event.target === state.focus) return state;
    let scene = state.scene;
    if (scene.interaction.mode === 'idle' && canonicalTarget(event.target) === 'pip') {
      scene = pipInteractionSceneReducer(scene, { type: 'focus', target: null });
    }
    scene = pipInteractionSceneReducer(scene, { type: 'focus', target: canonicalTarget(event.target) });
    return { ...state, focus: event.target, scene };
  }
  let activeId = state.activeId;
  let epoch = state.epoch;
  let sceneEvent: PipInteractionSceneEvent;
  if (event.type === 'activate') {
    if (state.scene.interaction.mode !== 'idle') return state;
    if (isResidentId(state.focus)) activeId = state.focus;
    sceneEvent = { type: 'activate', event: event.event };
    epoch++;
  } else if (event.type === 'offer') {
    if (!isResidentId(event.id)) return state;
    activeId = event.id;
    sceneEvent = { type: 'offer-object', target: event.target, reactionPoint: event.point, pipAvailable: event.available };
    epoch++;
  } else {
    if (event.epoch !== epoch || event.id !== activeId) return state;
    sceneEvent = event.event;
  }
  let scene = pipInteractionSceneReducer(state.scene, sceneEvent);
  if (scene === state.scene) return state;
  if (scene.interaction.mode === 'idle' && state.scene.interaction.mode !== 'idle'
    && (state.focus !== activeId || scene.interaction.focused !== canonicalTarget(state.focus))) {
    // The single-recipient engine deliberately ignores focus during reactions.
    // Reconcile the real resident before exposing its next action chain.
    scene = pipInteractionSceneReducer(scene, { type: 'focus', target: null });
    scene = pipInteractionSceneReducer(scene, { type: 'focus', target: canonicalTarget(state.focus) });
  }
  const resumed = scene.resumeSequence !== state.scene.resumeSequence;
  const completed = scene.completedMemory;
  return {
    ...state, scene, activeId, epoch,
    resumes: resumed ? { ...state.resumes, [activeId]: state.resumes[activeId] + 1 } : state.resumes,
    placements: sceneEvent.type === 'place-pip' && scene.placedPosition
      ? { ...state.placements, [activeId]: scene.placedPosition } : state.placements,
    completedMemory: completed && completed !== state.scene.completedMemory
      ? { ...completed, id: activeId } : state.completedMemory,
  };
}

export function residentActionLabel(state: ResidentInteractionState, live: ResidentTarget | null): string | null {
  const interaction = state.scene.interaction;
  if (interaction.mode === 'idle' && state.focus !== live) return null;
  const label = actionLabelForLiveTarget(interaction, canonicalTarget(live));
  if (!label) return null;
  const id = interaction.held === 'pip' ? state.activeId : isResidentId(live) ? live : state.activeId;
  const name = residentDefinition(id).name;
  return label.startsWith('Offer') ? `${label} to ${name}` : label.replace(/Pip/g, name);
}
