import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createPlanterProgress, type PlanterProgress } from './planterProgress';
import { migrateLegacyPlanter } from './projectProgress';
import PlanterJournal from './PlanterJournal';

const renderJournal = (
  progress: PlanterProgress,
  options: { busy?: boolean; comparing?: boolean } = {},
) => renderToStaticMarkup(createElement(PlanterJournal, {
  progress: migrateLegacyPlanter(progress),
  busy: options.busy ?? false,
  comparing: options.comparing ?? false,
  onMaterials: vi.fn(),
}));

describe('planter journal', () => {
  it('offers material delivery before the book arrives', () => {
    const markup = renderJournal(createPlanterProgress());

    expect(markup).toContain('A making-and-growing book can arrive with the reading nook.');
    expect(markup).toContain('>Simulate material delivery</button>');
    expect(markup).not.toContain('disabled=""');
    expect(markup).toContain('Fictional supplies. Refresh starts over.');
  });

  it.each([
    ['an interaction is busy', { busy: true }, createPlanterProgress()],
    ['a historical view is showing', { comparing: true }, createPlanterProgress()],
    ['materials already arrived', {}, { ...createPlanterProgress(), supplies: 'available' as const }],
  ])('disables repeat delivery when %s', (_reason, options, progress) => {
    expect(renderJournal(progress, options)).toContain('disabled=""');
  });

  it('confirms that early materials are waiting while the book is still absent', () => {
    const progress = { ...createPlanterProgress(), supplies: 'available' as const };

    expect(renderJournal(progress)).toContain('The materials are waiting safely in their basket.');
  });

  it('describes completed work and learned abilities without ranks', () => {
    const progress: PlanterProgress = {
      ...createPlanterProgress(),
      book: true,
      supplies: 'used',
      stage: 'planted',
      knowledge: { pip: ['assembly', 'planting'], moss: ['planting'], fern: [] },
    };
    const markup = renderJournal(progress);

    expect(markup).toContain('Their planter is part of the grove now.');
    expect(markup).toContain('Pip: fit pieces (familiar), use a mallet (familiar), prepare soil (familiar), plant seeds (familiar).');
    expect(markup).toContain('Moss: prepare soil (familiar), plant seeds (familiar).');
    expect(markup).not.toMatch(/level|rank|score/i);
    expect(markup).toContain('Familiar means encountered. Practiced means successfully used.');
    expect(markup).toContain('Legacy knowledge');
  });

  it.each([
    [{ book: true }, 'A new book is waiting to be explored.'],
    [{ book: true, knowledge: { pip: ['assembly' as const], moss: [], fern: [] } }, 'An idea is ready. Materials can arrive whenever.'],
    [{ book: true, supplies: 'committed' as const }, 'The spirits are making a planter together.'],
  ])('uses progress-specific project copy', (changes, copy) => {
    const progress = { ...createPlanterProgress(), ...changes } as PlanterProgress;
    expect(renderJournal(progress)).toContain(copy);
  });
});
