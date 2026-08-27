import { describe, expect, it } from 'vitest';
import { deriveGardenVisibility } from './rewardState';

describe('discovery seed state', () => {
  it('shows the seed before a destination is chosen', () => {
    expect(deriveGardenVisibility({ rewardStage: 3, gardenView: 'now', gardenChoice: null }).seedVisible).toBe(true);
  });

  it('consumes the current-state seed after a destination is chosen', () => {
    expect(deriveGardenVisibility({ rewardStage: 3, gardenView: 'now', gardenChoice: 'orchard' }).seedVisible).toBe(false);
  });

  it('keeps the historical seed visible in the before comparison', () => {
    expect(deriveGardenVisibility({ rewardStage: 3, gardenView: 'before', gardenChoice: 'orchard' }).seedVisible).toBe(true);
  });
});
