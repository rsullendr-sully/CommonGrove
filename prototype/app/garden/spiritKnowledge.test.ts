import { describe, expect, it } from 'vitest';
import type { AbilityId } from './abilities';
import {
  canPerform,
  createKnowledge,
  learnAbility,
  practiceAbility,
} from './spiritKnowledge';

describe('individual spirit knowledge', () => {
  it('reading permits fitting but cannot award practice', () => {
    const k = learnAbility(createKnowledge(), 'pip', 'B1', { kind: 'book', id: 'making-growing' });
    expect(k.pip.B1?.status).toBe('familiar');
    expect(k.moss.B1).toBeUndefined();
    expect(canPerform(k, 'pip', 'B1')).toBe(true);
    expect(practiceAbility(k, 'pip', 'B1').pip.B1?.status).toBe('practiced');
  });

  it('mallet work requires fitting knowledge', () => {
    const k = learnAbility(createKnowledge(), 'pip', 'B2', { kind: 'book', id: 'making-growing' });
    expect(canPerform(k, 'pip', 'B2')).toBe(false);
    expect(practiceAbility(k, 'pip', 'B2')).toBe(k);
  });

  it('keeps learning isolated to one resident and leaves prior snapshots unchanged', () => {
    const empty = createKnowledge();
    const learned = learnAbility(empty, 'moss', 'G1', { kind: 'observation', id: 'fern-levels-soil' });

    expect(empty.moss.G1).toBeUndefined();
    expect(learned.moss.G1).toEqual({ status: 'familiar', source: { kind: 'observation', id: 'fern-levels-soil' } });
    expect(learned.pip.G1).toBeUndefined();
    expect(learned.fern.G1).toBeUndefined();
  });

  it('preserves the first completed book or observation source idempotently', () => {
    const learned = learnAbility(createKnowledge(), 'pip', 'B1', { kind: 'book', id: 'making-growing' });
    expect(learnAbility(learned, 'pip', 'B1', { kind: 'observation', id: 'moss-fits-joint' })).toBe(learned);
    expect(learnAbility(learned, 'pip', 'B1', { kind: 'book', id: 'another-copy' })).toBe(learned);

    const practiced = practiceAbility(learned, 'pip', 'B1');
    expect(practiceAbility(practiced, 'pip', 'B1')).toBe(practiced);
    expect(practiced.pip.B1?.source).toEqual({ kind: 'book', id: 'making-growing' });
  });

  it('keeps preview provenance explicit until genuine learning replaces it', () => {
    const previewed = learnAbility(createKnowledge(), 'fern', 'G1', { kind: 'preview', id: 'scenario-preview' });
    expect(previewed.fern.G1).toEqual({ status: 'familiar', source: { kind: 'preview', id: 'scenario-preview' } });
    expect(learnAbility(previewed, 'fern', 'G1', { kind: 'legacy', id: 'migration' })).toBe(previewed);

    const observed = learnAbility(previewed, 'fern', 'G1', { kind: 'observation', id: 'pip-levels-soil' });
    expect(observed.fern.G1).toEqual({ status: 'familiar', source: { kind: 'observation', id: 'pip-levels-soil' } });
    expect(learnAbility(observed, 'fern', 'G1', { kind: 'book', id: 'making-growing' })).toBe(observed);
  });

  it('allows learning ahead while blocking practice until every prerequisite is known', () => {
    const planted = learnAbility(createKnowledge(), 'pip', 'G2', { kind: 'book', id: 'making-growing' });
    expect(planted.pip.G2?.status).toBe('familiar');
    expect(canPerform(planted, 'pip', 'G2')).toBe(false);

    const prepared = learnAbility(planted, 'pip', 'G1', { kind: 'observation', id: 'moss-levels-soil' });
    expect(canPerform(prepared, 'pip', 'G2')).toBe(true);
    expect(practiceAbility(prepared, 'pip', 'G2').pip.G2?.status).toBe('practiced');
  });

  it('rejects disabled and unknown abilities for performance and practice', () => {
    const disabled = learnAbility(createKnowledge(), 'pip', 'B3', { kind: 'book', id: 'future-building' });
    expect(disabled.pip.B3?.status).toBe('familiar');
    expect(canPerform(disabled, 'pip', 'B3')).toBe(false);
    expect(practiceAbility(disabled, 'pip', 'B3')).toBe(disabled);

    const unknown = 'Z9' as AbilityId;
    expect(learnAbility(disabled, 'pip', unknown, { kind: 'book', id: 'unknown' })).toBe(disabled);
    expect(canPerform(disabled, 'pip', unknown)).toBe(false);
    expect(practiceAbility(disabled, 'pip', unknown)).toBe(disabled);
  });

  it('creates independent empty records for all residents', () => {
    const first = createKnowledge();
    const second = createKnowledge();
    expect(first).toEqual({ pip: {}, moss: {}, fern: {} });
    expect(first).not.toBe(second);
    expect(first.pip).not.toBe(first.moss);
    expect(first.pip).not.toBe(second.pip);
  });
});
