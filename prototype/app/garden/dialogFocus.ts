type DialogTabEvent = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>;

const FOCUSABLE_CONTROLS = 'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

export function trapDialogTab(
  event: DialogTabEvent,
  dialog: HTMLElement | null,
  activeElement: Element | null,
): boolean {
  if (event.key !== 'Tab' || !dialog) return false;
  const controls = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_CONTROLS));
  if (controls.length === 0) return false;
  const first = controls[0];
  const last = controls[controls.length - 1];
  const target = event.shiftKey && activeElement === first
    ? last
    : !event.shiftKey && activeElement === last
      ? first
      : null;
  if (!target) return false;
  event.preventDefault();
  target.focus();
  return true;
}
