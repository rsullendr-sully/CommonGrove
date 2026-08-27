export type GardenChoice = 'orchard' | 'workshop';
export type GardenView = 'before' | 'now';

export type GardenVisibility = {
  starflowersVisible: boolean;
  pavilionImproved: boolean;
  seedVisible: boolean;
  destinationVisible: GardenChoice | null;
};

export function deriveGardenVisibility({
  rewardStage,
  gardenView,
  gardenChoice,
}: {
  rewardStage: 0 | 1 | 2 | 3;
  gardenView: GardenView;
  gardenChoice: GardenChoice | null;
}): GardenVisibility {
  return {
    starflowersVisible: rewardStage > 1 || (rewardStage === 1 && gardenView === 'now'),
    pavilionImproved: rewardStage > 2 || (rewardStage === 2 && gardenView === 'now'),
    seedVisible: rewardStage === 3 && (gardenChoice === null ? gardenView === 'now' : gardenView === 'before'),
    destinationVisible: rewardStage === 3 && gardenView === 'now' ? gardenChoice : null,
  };
}
