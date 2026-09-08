import type { PipActivityKind } from './behavior';
import { residentDefinition, residentsForVisit, type ResidentId } from './residents';
import { deriveGardenVisibility, type GardenChoice, type GardenView } from './rewardState';

export type Visit = 1 | 2 | 3 | 4;
export type MemoryKind = 'pet' | 'snack' | 'toy';
export type JourneyState = {
  visit: Visit;
  rewardStage: 0 | 1 | 2 | 3;
  choice: GardenChoice | null;
  previousChoice: GardenChoice | null;
  lastInteraction: MemoryKind | null;
  returnMemory: MemoryKind | null;
  residentMemories?: Partial<Record<ResidentId, MemoryKind>>;
  residentReturnMemories?: Partial<Record<ResidentId, MemoryKind>>;
};
export type JourneyEvent =
  | { type: 'accomplishment' }
  | { type: 'choose'; choice: GardenChoice }
  | { type: 'remember'; interaction: MemoryKind; residentId?: ResidentId }
  | { type: 'preview-community' }
  | { type: 'return' }
  | { type: 'reset' };

export function createJourney(): JourneyState {
  return { visit: 1, rewardStage: 0, choice: null, previousChoice: null, lastInteraction: null, returnMemory: null };
}

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  switch (event.type) {
    case 'accomplishment':
      return state.visit === 1 && state.rewardStage < 3
        ? { ...state, rewardStage: (state.rewardStage + 1) as JourneyState['rewardStage'] } : state;
    case 'choose':
      return state.rewardStage === 3 && !state.choice ? { ...state, choice: event.choice } : state;
    case 'remember': {
      const id = event.residentId ?? 'pip';
      if (!residentsForVisit(state.visit).some(r => r.id === id)) return state;
      if (id === 'pip') return state.lastInteraction === event.interaction ? state : { ...state, lastInteraction: event.interaction };
      if (state.residentMemories?.[id] === event.interaction) return state;
      return { ...state, residentMemories: { ...state.residentMemories, [id]: event.interaction } };
    }
    case 'return':
      return state.rewardStage === 3 && state.visit < 4 ? {
        ...state, visit: (state.visit + 1) as Visit, previousChoice: state.choice, returnMemory: state.lastInteraction,
        ...(state.residentMemories ? { residentReturnMemories: { ...state.residentMemories } } : {}),
      } : state;
    case 'preview-community': {
      if (state.visit >= 3) return state;
      let next = { ...state, rewardStage: 3 as const };
      while (next.visit < 3) next = journeyReducer(next, { type: 'return' }) as typeof next;
      return next;
    }
    case 'reset': return createJourney();
  }
}

export function projectJourneyScene(state: JourneyState, view: GardenView) {
  const historical = state.visit > 1 && view === 'before';
  const visit = (historical ? state.visit - 1 : state.visit) as Visit;
  const choice = historical ? state.previousChoice : state.choice;
  return {
    visit,
    ...deriveGardenVisibility({
      rewardStage: state.rewardStage,
      gardenView: state.visit === 1 ? view : 'now',
      gardenChoice: choice,
    }),
  };
}

export const RETURN_CHAPTERS = {
  1: { title: 'A new beginning', time: 'Your first return', next: 'Return one week later', summary: 'Small contributions are finding their way here. Meet Pip, explore the grove, and see the first changes take root.' },
  2: { title: 'Taking root', time: 'One week later', next: 'Return several weeks later', summary: 'The flower beds have spread, and the reading pavilion has become a place Pip uses. New contributions helped the garden settle in while you were away.' },
  3: { title: 'Becoming yours', time: 'Several weeks later', next: 'Return one season later', summary: 'The little changes now belong together. Pip has a familiar route through the grove, with time for the flowers, the books, and whatever sparks a little curiosity.' },
  4: { title: 'An established grove', time: 'One season later', next: null, summary: 'A place that once held possibilities now holds little traditions. Pip knows his way around, the landmarks have grown, and there is always room for another discovery.' },
} as const;

export const MEMORY_STORIES: Record<MemoryKind, { title: string; story: string; greeting: string }> = {
  pet: { title: 'A familiar kindness', story: 'Pip remembers the time you stopped to pet him. His greeting is familiar now, and he has taken a liking to the quiet reading corner.', greeting: 'You’re back! There’s a quiet spot by the books if you feel like staying a while.' },
  snack: { title: 'A little shared moment', story: 'Pip remembers the snack you shared. He has taken a liking to the flower beds, stopping to inspect the small things growing there.', greeting: 'Hello again! I found something lovely by the flowers. Come have a look whenever you like.' },
  toy: { title: 'Room for a little play', story: 'Pip remembers nudging the wooden ring with you. He enjoys pausing to look around for other things that catch his curiosity.', greeting: 'You’re here! I still remember our little game. There’s more to explore today.' },
};

export type PipJourneyProfile = {
  memory: MemoryKind | null;
  greeting: string;
  preferredKind: PipActivityKind;
  routineMessage: string;
};

export function getPipJourneyProfile(state: JourneyState): PipJourneyProfile {
  const memory = state.returnMemory;
  const destinationRoutine = state.visit >= 3 && state.choice !== null;
  const preferredKind = destinationRoutine ? 'inspect-destination'
    : memory === 'pet' ? 'visit-pavilion'
    : memory === 'snack' ? 'inspect-flowers'
    : memory === 'toy' ? 'look-around' : 'watch-pond';
  return {
    memory,
    greeting: state.visit === 1 ? 'Oh! You’re here. There’s a whole little grove to explore together.'
      : memory ? MEMORY_STORIES[memory].greeting
      : state.visit === 4 ? 'There you are. The grove feels like home now. I’ll be nearby.'
      : 'Welcome back. I’ve been exploring—there are a few new things to show you.',
    preferredKind,
    routineMessage: destinationRoutine
      ? state.choice === 'orchard' ? 'Pip settles into his familiar lantern-watching spot.' : 'Pip inspects the little inventions outside his favorite workshop.'
      : preferredKind === 'visit-pavilion' ? 'Pip settles beside the books, one ear still listening.'
      : preferredKind === 'inspect-flowers' ? 'Pip pauses to inspect the newest flowers.'
      : preferredKind === 'look-around' ? 'Pip pauses to look around for something interesting.'
      : 'Pip stops by the pond for a familiar quiet moment.',
  };
}

export function getDestinationStory(visit: Visit, choice: GardenChoice | null): string {
  if (!choice) return 'The curious seed is still waiting safely. The rest of the grove keeps growing; this choice can wait.';
  const orchard = choice === 'orchard';
  if (visit === 1) return orchard ? 'Lantern saplings mark the beginning of your orchard.' : 'A small workshop marks the beginning of a place for making.';
  if (visit === 2) return orchard ? 'The saplings have fuller crowns. Pip has found a spot among their first lanterns.' : 'The workshop has its first outdoor work shelf, with a small wind spinner taking shape.';
  if (visit === 3) return orchard ? 'The crowns have opened into a sheltered grove, with lanterns tucked among the branches.' : 'A finished wind sculpture turns beside the workshop. Pip stops to inspect it on his rounds.';
  return orchard ? 'The Lantern Orchard is now a warm canopy of leaves and light—a familiar destination in your garden.' : 'The Tinker Workshop is now a cheerful corner of finished inventions, warm windows, and things to discover.';
}

export function getResidentJourneyProfile(state: JourneyState, id: ResidentId): PipJourneyProfile {
  if (id === 'pip') return getPipJourneyProfile(state);
  const resident = residentDefinition(id);
  const memory = state.residentReturnMemories?.[id] ?? null;
  const preferredKind = memory === 'pet' ? 'visit-pavilion' : memory === 'snack' ? 'inspect-flowers' : resident.preferredKind;
  return {
    memory,
    preferredKind,
    greeting: memory ? MEMORY_STORIES[memory].greeting
      : state.visit === resident.firstVisit ? `Hello! I’m ${resident.name}. I’m finding my favorite spots here.`
      : `Hello again. It’s ${resident.name}—there’s room for a quiet moment together.`,
    routineMessage: preferredKind === 'watch-pond' ? `${resident.name} watches the ripples settle.`
      : preferredKind === 'visit-pavilion' ? `${resident.name} settles beside the familiar books.`
      : preferredKind === 'inspect-flowers' ? `${resident.name} inspects a little patch of flowers.`
      : `${resident.name} perks up, looking for something to play with.`,
  };
}
