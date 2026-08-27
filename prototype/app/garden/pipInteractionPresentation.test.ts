import { describe, expect, it } from 'vitest';
import { pipInteractionStatusText } from './pipInteractionPresentation';

describe('Pip interaction presentation', () => {
  it.each([
    ['pet', 'Pip leans into your hand, listening ear tipped toward you.'],
    ['eating', 'Pip takes a few pleased bites, listening ear bobbing.'],
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
});
