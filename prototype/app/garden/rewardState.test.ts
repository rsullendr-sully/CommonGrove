import { describe, expect, it } from 'vitest';
import { deriveGardenVisibility } from './rewardState';

describe('discovery seed and destination state', () => {
  it.each([
    { gardenView: 'before' as const, gardenChoice: null, seedVisible: false, destinationVisible: null },
    { gardenView: 'now' as const, gardenChoice: null, seedVisible: true, destinationVisible: null },
    { gardenView: 'before' as const, gardenChoice: 'orchard' as const, seedVisible: true, destinationVisible: null },
    { gardenView: 'now' as const, gardenChoice: 'orchard' as const, seedVisible: false, destinationVisible: 'orchard' },
    { gardenView: 'before' as const, gardenChoice: 'workshop' as const, seedVisible: true, destinationVisible: null },
    { gardenView: 'now' as const, gardenChoice: 'workshop' as const, seedVisible: false, destinationVisible: 'workshop' },
  ])(
    'derives the $gardenView view when the choice is $gardenChoice',
    ({ gardenView, gardenChoice, seedVisible, destinationVisible }) => {
      const visibility = deriveGardenVisibility({ rewardStage: 3, gardenView, gardenChoice });

      expect(visibility.seedVisible).toBe(seedVisible);
      expect(visibility.destinationVisible).toBe(destinationVisible);
    },
  );
});
