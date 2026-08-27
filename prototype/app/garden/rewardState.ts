export type GardenChoice = 'orchard' | 'workshop';
export type GardenView = 'before' | 'now';

export function deriveGardenVisibility({
  rewardStage,
  gardenView,
  gardenChoice,
}: {
  rewardStage: 0 | 1 | 2 | 3;
  gardenView: GardenView;
  gardenChoice: GardenChoice | null;
}) {
  return {
    starflowersVisible: rewardStage > 1 || (rewardStage === 1 && gardenView === 'now'),
    pavilionImproved: rewardStage > 2 || (rewardStage === 2 && gardenView === 'now'),
    seedVisible: rewardStage === 3 && (gardenView === 'before' || gardenChoice === null),
  };
}
