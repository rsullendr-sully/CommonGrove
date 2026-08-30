import { describe, expect, it } from 'vitest';
import {
  createStorybookEnvironmentLayout,
  getEnvironmentPresentation,
  validateEnvironmentLayout,
} from './environmentLayout';

describe('storybook environment layout', () => {
  it('recreates fresh, exactly equal authored placement data', () => {
    const first = createStorybookEnvironmentLayout();
    const second = createStorybookEnvironmentLayout();

    expect(first).not.toBe(second);
    expect(first.trees).not.toBe(second.trees);
    expect(first).toEqual(second);
  });

  it('uses the approved authored corridor routes', () => {
    expect(createStorybookEnvironmentLayout().corridors).toEqual([
      { id: 'spawn-to-pond', start: { x: 0, z: 18 }, end: { x: 0, z: 7.55 }, halfWidth: 1.35 },
      { id: 'pond-to-pavilion', start: { x: -5.8, z: -4.2 }, end: { x: -10.4, z: -9.5 }, halfWidth: 1.2 },
      { id: 'pond-east-loop', start: { x: 6.9, z: 2.5 }, end: { x: 13.5, z: 5.8 }, halfWidth: 1.15 },
      { id: 'pond-west-loop', start: { x: -6.9, z: 2.5 }, end: { x: -13.5, z: 5.8 }, halfWidth: 1.15 },
    ]);
  });

  it('retains the three canonical tree obstacle roots', () => {
    expect(createStorybookEnvironmentLayout().trees).toEqual(expect.arrayContaining([
      { id: 'tree-east-north', position: [11.8, 0, -9.2], scale: [1.05, 1.05, 1.05], rotationY: 0.18, variant: 0 },
      { id: 'tree-east-south', position: [14.4, 0, 5.8], scale: [0.88, 0.88, 0.88], rotationY: -0.42, variant: 1 },
      { id: 'tree-west-south', position: [-14.8, 0, 4.5], scale: [0.94, 0.94, 0.94], rotationY: 0.66, variant: 2 },
    ]));
  });

  it('keeps the approved layout inside its safety contract', () => {
    expect(validateEnvironmentLayout(createStorybookEnvironmentLayout())).toEqual([]);
  });

  it('reports duplicate ids, blocked corridors, and an escaped pond stone', () => {
    const layout = createStorybookEnvironmentLayout();
    const invalid = {
      ...layout,
      trees: [...layout.trees, { ...layout.trees[0] }],
      plantingBeds: [
        ...layout.plantingBeds,
        { id: 'blocked-spawn', center: { x: 0, z: 14 }, radius: 2 },
      ],
      pondStones: [
        ...layout.pondStones,
        { id: 'escaped-stone', position: [7.2, 0, 0], scale: [1, 1, 1], rotationY: 0, variant: 0 },
      ],
    };

    expect(validateEnvironmentLayout(invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining('duplicate id'),
      expect.stringContaining('blocked-spawn'),
      expect.stringContaining('escaped-stone'),
    ]));
  });
});

describe('storybook environment presentation', () => {
  it('raises only declared local accents as rewards appear', () => {
    expect(getEnvironmentPresentation({
      rewardStage: 3,
      pavilionImproved: true,
      starflowersVisible: true,
      seedVisible: false,
      destinationVisible: null,
      reducedMotion: false,
    })).toMatchObject({ pondGlow: 1, sanctuaryGlow: 1.25, pavilionGlow: 1.35, starflowerGlow: 1.4 });
  });

  it.each(['orchard', 'workshop'] as const)('gives %s an equal-strength destination accent', (choice) => {
    const presentation = getEnvironmentPresentation({
      rewardStage: 3,
      pavilionImproved: true,
      starflowersVisible: true,
      seedVisible: false,
      destinationVisible: choice,
      reducedMotion: false,
    });
    expect(presentation.destinationAccent).toBe(choice);
    expect(presentation.destinationGlow).toBe(1.5);
  });

  it('retains static magic but disables continuous motion when reduced motion is requested', () => {
    expect(getEnvironmentPresentation({
      rewardStage: 2,
      pavilionImproved: true,
      starflowersVisible: true,
      seedVisible: false,
      destinationVisible: null,
      reducedMotion: true,
    })).toMatchObject({ moteMotion: false, rippleMotion: false, cloudMotion: false, pondGlow: 0.9 });
  });
});
