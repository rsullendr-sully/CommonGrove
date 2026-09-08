import type { PipActivityKind } from './behavior';

export type ResidentId = 'pip' | 'moss' | 'fern';
export type ResidentTarget = ResidentId | 'food' | 'toy';
export type ResidentAppearance = {
  headShape: 'roundling' | 'wisp' | 'pebblekin';
  body: string;
  accent: string;
  markings: 'freckles' | 'patches' | 'brow';
  ears: 'listening' | 'round' | 'tipped';
};
export type ResidentDefinition = {
  id: ResidentId;
  name: string;
  firstVisit: number;
  spawn: readonly [number, number, number];
  seed: number;
  preferredKind: PipActivityKind;
  journalNote: string;
  appearance: ResidentAppearance;
};

// Keep the compact clay residents readable at conversational distance without
// letting a close first-person approach fill the whole viewport.
export const RESIDENT_WORLD_SCALE = 0.72;

export const RESIDENTS: readonly ResidentDefinition[] = [
  { id: 'pip', name: 'Pip', firstVisit: 1, spawn: [.65, 0, 14.9], seed: 37, preferredKind: 'look-around', journalNote: 'Follows quiet landmarks and familiar paths.',
    appearance: { headShape: 'wisp', body: '#f4cc85', accent: '#b07951', markings: 'freckles', ears: 'listening' } },
  { id: 'moss', name: 'Moss', firstVisit: 2, spawn: [-3.6, 0, 12.7], seed: 913, preferredKind: 'watch-pond', journalNote: 'Lingers by the water and watches the grove settle.',
    appearance: { headShape: 'pebblekin', body: '#afd6b8', accent: '#568e83', markings: 'patches', ears: 'round' } },
  { id: 'fern', name: 'Fern', firstVisit: 3, spawn: [4.2, 0, 12.1], seed: 5041, preferredKind: 'look-around', journalNote: 'Follows new sounds, then circles back to explore.',
    appearance: { headShape: 'roundling', body: '#dfb3b9', accent: '#9b6986', markings: 'brow', ears: 'tipped' } },
];

export function isResidentId(value: unknown): value is ResidentId {
  return RESIDENTS.some(r => r.id === value);
}

export function residentDefinition(id: ResidentId): ResidentDefinition {
  return RESIDENTS.find(r => r.id === id)!;
}

export function residentsForVisit(visit: number): readonly ResidentDefinition[] {
  return RESIDENTS.filter(r => r.firstVisit <= visit);
}

export function createResidentRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

type Marking = { position: [number, number, number]; scale: [number, number, number] };
export function appearanceFeatures(appearance: ResidentAppearance): { earScale: [number, number, number]; markings: Marking[] } {
  return {
    earScale: appearance.ears === 'round' ? [1.4, .62, 1.2] : [1, 1, 1],
    markings: appearance.markings === 'patches'
      ? [-1, 1].map(side => ({ position: [side * .18, .15, .249], scale: [.05, .032, .012] }))
      : appearance.markings === 'brow'
        ? [-1, 1].map(side => ({ position: [side * .095, .352, .25], scale: [.047, .014, .01] }))
        : [[.19, .19, .25], [.215, .145, .238], [.175, .12, .252]].map(position => ({ position: position as Marking['position'], scale: [.014, .014, .008] })),
  };
}
