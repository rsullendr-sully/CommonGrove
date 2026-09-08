import { describe, expect, it } from 'vitest';
import { trapDialogTab } from './dialogFocus';

type FocusableFixture = HTMLElement & { focused: boolean };

const control = (): FocusableFixture => {
  const fixture = {
    focused: false,
    focus() { fixture.focused = true; },
  };
  return fixture as FocusableFixture;
};

const dialog = (controls: HTMLElement[]) => ({
  querySelectorAll: () => controls,
}) as unknown as HTMLElement;

const tabEvent = (shiftKey: boolean) => {
  const event = {
    key: 'Tab',
    shiftKey,
    defaultPrevented: false,
    preventDefault() { event.defaultPrevented = true; },
  };
  return event;
};

describe('ordinary dialog keyboard traps', () => {
  it('wraps the choice dialog at its forward and backward boundaries', () => {
    const close = control();
    const orchard = control();
    const workshop = control();
    const boundary = dialog([close, orchard, workshop]);

    const forward = tabEvent(false);
    expect(trapDialogTab(forward, boundary, workshop)).toBe(true);
    expect(forward.defaultPrevented).toBe(true);
    expect(close.focused).toBe(true);

    const backward = tabEvent(true);
    expect(trapDialogTab(backward, boundary, close)).toBe(true);
    expect(backward.defaultPrevented).toBe(true);
    expect(workshop.focused).toBe(true);
  });

  it('wraps the privacy dialog at its forward and backward boundaries', () => {
    const close = control();
    const comfortable = control();
    const unsure = control();
    const invasive = control();
    const done = control();
    const boundary = dialog([close, comfortable, unsure, invasive, done]);

    const forward = tabEvent(false);
    expect(trapDialogTab(forward, boundary, done)).toBe(true);
    expect(forward.defaultPrevented).toBe(true);
    expect(close.focused).toBe(true);

    const backward = tabEvent(true);
    expect(trapDialogTab(backward, boundary, close)).toBe(true);
    expect(backward.defaultPrevented).toBe(true);
    expect(done.focused).toBe(true);
  });
});
