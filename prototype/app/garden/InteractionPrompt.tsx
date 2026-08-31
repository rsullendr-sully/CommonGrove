'use client';

import { useEffect, useMemo } from 'react';

type ControlLike = {
  tagName?: unknown;
  parentElement?: unknown;
};

type InteractionKeyEvent = {
  key: string;
  repeat: boolean;
  target: unknown;
  preventDefault: () => void;
};

const SUPPRESSED_CONTROL_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'SUMMARY']);

export function interactionReticleClassName(label: string | null): string {
  return label ? 'world-reticle active' : 'world-reticle';
}

export function isInteractionControlTarget(target: unknown): boolean {
  let current = target;
  const visited = new Set<unknown>();

  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current);
    const element = current as ControlLike;
    if (
      typeof element.tagName === 'string' &&
      SUPPRESSED_CONTROL_TAGS.has(element.tagName.toUpperCase())
    ) {
      return true;
    }
    current = element.parentElement;
  }

  return false;
}

export function activateFromInteractionKey(
  event: InteractionKeyEvent,
  onActivate: () => void,
): boolean {
  if (
    event.repeat ||
    event.key.toLowerCase() !== 'e' ||
    isInteractionControlTarget(event.target)
  ) {
    return false;
  }

  event.preventDefault();
  onActivate();
  return true;
}

export function createInteractionHandlers(onActivate: () => void) {
  return {
    onButtonClick: onActivate,
    onKeyDown: (event: InteractionKeyEvent) => activateFromInteractionKey(event, onActivate),
  };
}

export default function InteractionPrompt({
  label,
  onActivate,
}: {
  label: string | null;
  onActivate: () => void;
}) {
  const handlers = useMemo(() => createInteractionHandlers(onActivate), [onActivate]);

  useEffect(() => {
    if (!label) return;

    const onKeyDown = (event: KeyboardEvent) => {
      handlers.onKeyDown(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, label]);

  if (!label) return null;

  return (
    <div className="interaction-prompt">
      <span aria-hidden="true">E</span>
      <button type="button" aria-label={label} onClick={handlers.onButtonClick}>{label}</button>
    </div>
  );
}
