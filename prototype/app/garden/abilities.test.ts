import { describe, expect, it } from 'vitest';
import {
  ABILITY_CATALOG,
  type AbilityCatalogEntry,
  type AbilityId,
  validateAbilityCatalog,
} from './abilities';

const expectedRows: readonly [AbilityId, string, string, readonly AbilityId[]][] = [
  ['B1', 'building', 'fit pieces', []],
  ['B2', 'building', 'use a mallet', ['B1']],
  ['B3', 'building', 'brace structures', ['B2']],
  ['B4', 'building', 'assemble mechanisms', ['B3']],
  ['G1', 'growing', 'prepare soil', []],
  ['G2', 'growing', 'plant seeds', ['G1']],
  ['G3', 'growing', 'use a watering can', ['G2']],
  ['G4', 'growing', 'gather mature plants', ['G2']],
  ['C1', 'crafting', 'shape clay', []],
  ['C2', 'crafting', 'weave fibers', []],
  ['C3', 'crafting', 'mix pigments', []],
  ['C4', 'crafting', 'decorate objects', ['C3']],
  ['S1', 'cooperation', 'carry together', []],
  ['S2', 'cooperation', 'hold parts steady', ['B1']],
  ['S3', 'cooperation', 'pass tools', []],
  ['S4', 'cooperation', 'demonstrate a skill', []],
  ['P1', 'play', 'balance', []],
  ['P2', 'play', 'roll toward a target', []],
  ['P3', 'play', 'catch', ['P2']],
  ['P4', 'play', 'pass to a partner', ['P3']],
];

describe('ability catalog', () => {
  it('describes all twenty planned abilities with the approved prerequisite graph', () => {
    expect(ABILITY_CATALOG.map(({ id, path, name, prerequisites }) => [id, path, name, prerequisites])).toEqual(expectedRows);
    expect(new Set(ABILITY_CATALOG.map(row => row.id)).size).toBe(20);
    expect(validateAbilityCatalog()).toEqual([]);
  });

  it('enables only the four abilities in the learning-demo milestone', () => {
    expect(ABILITY_CATALOG.filter(row => row.enabled).map(row => row.id)).toEqual(['B1', 'B2', 'G1', 'G2']);
  });

  it('rejects duplicate identifiers and cycles in candidate catalogs', () => {
    const duplicate = [...ABILITY_CATALOG, ABILITY_CATALOG[0]];
    expect(validateAbilityCatalog(duplicate)).toContain('Duplicate ability id: B1');

    const cycle = ABILITY_CATALOG.map(row => {
      if (row.id === 'B1') return { ...row, prerequisites: ['B2'] as const };
      if (row.id === 'B2') return { ...row, prerequisites: ['B1'] as const };
      return row;
    });
    expect(validateAbilityCatalog(cycle)).toContain('Prerequisite cycle: B1 -> B2 -> B1');
  });

  it('rejects prerequisites that do not name a catalog ability', () => {
    const invalid = ABILITY_CATALOG.map(row => row.id === 'B2'
      ? { ...row, prerequisites: ['Z9' as AbilityId] }
      : row) satisfies readonly AbilityCatalogEntry[];
    expect(validateAbilityCatalog(invalid)).toContain('Unknown prerequisite for B2: Z9');
  });
});
