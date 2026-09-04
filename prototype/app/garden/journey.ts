import type { PipActivityKind } from './behavior';
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
};
export type JourneyEvent =
  | { type: 'accomplishment' }
  | { type: 'choose'; choice: GardenChoice }
  | { type: 'remember'; interaction: MemoryKind }
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
    case 'remember':
      return state.lastInteraction === event.interaction ? state : { ...state, lastInteraction: event.interaction };
    case 'return':
      return state.rewardStage === 3 && state.visit < 4 ? {
        ...state, visit: (state.visit + 1) as Visit, previousChoice: state.choice, returnMemory: state.lastInteraction,
      } : state;
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
  3: { title: 'Becoming yours', time: 'Several weeks later', next: 'Return one season later', summary: 'The little changes now belong together. Pip has a familiar route through the grove, with time for the flowers, the books, and whatever catches his listening ear.' },
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
