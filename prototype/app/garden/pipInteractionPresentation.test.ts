import { describe, expect, it } from 'vitest';
import { pipInteractionStatusText, pipLiveRegionLabel } from './pipInteractionPresentation';

describe('Pip interaction presentation', () => {
  it('does not announce the direct response before the safe approach arrives', () => {
    expect(pipInteractionStatusText('greet-approach', null, 'ordinary activity')).toBeNull();
  });

  it.each([
    ['greet', 'Pip steps closer and gives a little stretch in hello.'],
    ['pet', 'Pip tips gently to one side, eyes closed in contentment.'],
    ['eating', 'Pip takes a few pleased bites, dipping toward the snack.'],
    ['playing', 'Pip trots over and gives the wooden rings one careful nudge.'],
  ] as const)('narrates the %s result without relying on animation', (phase, expected) => {
    expect(pipInteractionStatusText(phase, null, 'ordinary activity')).toBe(expected);
  });

  it('prioritizes safe-placement feedback over ordinary behavior copy', () => {
    expect(pipInteractionStatusText('placed', 'Returned to safe ground.', 'ordinary activity'))
      .toBe('Returned to safe ground.');
  });

  it('keeps ordinary behavior copy readable outside a direct interaction', () => {
    expect(pipInteractionStatusText('none', null, 'Pip pauses beside the pond.'))
      .toBe('Pip pauses beside the pond.');
  });

  it('omits an empty live region and separates Pip semantically from real message copy', () => {
    expect(pipLiveRegionLabel(null)).toBeNull();
    expect(pipLiveRegionLabel('One ear lifts.')).toBe('Pip: One ear lifts.');
  });
});
