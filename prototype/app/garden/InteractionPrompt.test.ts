import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import InteractionPrompt from './InteractionPrompt';
import {
  activateFromInteractionKey,
  createInteractionHandlers,
  interactionReticleClassName,
  isInteractionControlTarget,
} from './InteractionPrompt';

describe('contextual interaction input', () => {
  it('visually activates the reticle whenever a contextual action is available', () => {
    expect(interactionReticleClassName(null)).toBe('world-reticle');
    expect(interactionReticleClassName('Greet Pip')).toBe('world-reticle active');
    expect(interactionReticleClassName('Place toy')).toBe('world-reticle active');
  });

  it('uses the same contextual action as the button accessible and visible label', () => {
    const markup = renderToStaticMarkup(createElement(InteractionPrompt, {
      label: 'Offer snack',
      onActivate: vi.fn(),
    }));

    expect(markup).toContain('aria-label="Offer snack"');
    expect(markup).toContain('>Offer snack</button>');
  });

  it.each(['input', 'select', 'textarea', 'button', 'summary'])(
    'suppresses E when the event target is a %s control',
    (tagName) => {
      expect(isInteractionControlTarget({ tagName: tagName.toUpperCase(), parentElement: null })).toBe(true);
    },
  );

  it('suppresses E from content nested inside a control', () => {
    const button = { tagName: 'BUTTON', parentElement: null };
    const icon = { tagName: 'SPAN', parentElement: button };

    expect(isInteractionControlTarget(icon)).toBe(true);
  });

  it('ignores repeated E keydowns', () => {
    const onActivate = vi.fn();

    expect(
      activateFromInteractionKey(
        { key: 'e', repeat: true, target: null, preventDefault: vi.fn() },
        onActivate,
      ),
    ).toBe(false);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it.each(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'])(
    'never activates from movement key %s',
    (key) => {
      const onActivate = vi.fn();

      expect(
        activateFromInteractionKey(
          { key, repeat: false, target: null, preventDefault: vi.fn() },
          onActivate,
        ),
      ).toBe(false);
      expect(onActivate).not.toHaveBeenCalled();
    },
  );

  it('routes eligible E through the same activation callback exposed to the button', () => {
    const onActivate = vi.fn();
    const preventDefault = vi.fn();
    const handlers = createInteractionHandlers(onActivate);

    expect(
      handlers.onKeyDown({ key: 'E', repeat: false, target: null, preventDefault }),
    ).toBe(true);
    handlers.onButtonClick();

    expect(handlers.onButtonClick).toBe(onActivate);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onActivate).toHaveBeenCalledTimes(2);
  });
});
