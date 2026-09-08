export type AbilityId = 'B1' | 'B2' | 'B3' | 'B4' | 'G1' | 'G2' | 'G3' | 'G4' |
  'C1' | 'C2' | 'C3' | 'C4' | 'S1' | 'S2' | 'S3' | 'S4' | 'P1' | 'P2' | 'P3' | 'P4';

export type AbilityPath = 'building' | 'growing' | 'crafting' | 'cooperation' | 'play';

export type AbilityCatalogEntry = {
  id: AbilityId;
  path: AbilityPath;
  name: string;
  prerequisites: readonly AbilityId[];
  enabled: boolean;
  visibleProof: string;
};

export const ABILITY_CATALOG = [
  { id: 'B1', path: 'building', name: 'fit pieces', prerequisites: [], enabled: true, visibleProof: 'Rotate and seat a wooden part into a matching joint' },
  { id: 'B2', path: 'building', name: 'use a mallet', prerequisites: ['B1'], enabled: true, visibleProof: 'Tap a seated joint; fastening visibly completes' },
  { id: 'B3', path: 'building', name: 'brace structures', prerequisites: ['B2'], enabled: false, visibleProof: 'Attach a diagonal brace to a small workbench' },
  { id: 'B4', path: 'building', name: 'assemble mechanisms', prerequisites: ['B3'], enabled: false, visibleProof: 'Fit an axle and wheel; the completed rolling toy moves' },
  { id: 'G1', path: 'growing', name: 'prepare soil', prerequisites: [], enabled: true, visibleProof: 'Tip soil into a bed and level its surface' },
  { id: 'G2', path: 'growing', name: 'plant seeds', prerequisites: ['G1'], enabled: true, visibleProof: 'Place seeds in prepared soil; the planted stage appears' },
  { id: 'G3', path: 'growing', name: 'use a watering can', prerequisites: ['G2'], enabled: false, visibleProof: 'Carry and tilt the can with a readable pour, then put it away' },
  { id: 'G4', path: 'growing', name: 'gather mature plants', prerequisites: ['G2'], enabled: false, visibleProof: 'Gather a flower from a ready bed and place it in a basket' },
  { id: 'C1', path: 'crafting', name: 'shape clay', prerequisites: [], enabled: false, visibleProof: 'Press a clay lump into a small pot' },
  { id: 'C2', path: 'crafting', name: 'weave fibers', prerequisites: [], enabled: false, visibleProof: 'Alternate strands until a basket takes shape' },
  { id: 'C3', path: 'crafting', name: 'mix pigments', prerequisites: [], enabled: false, visibleProof: 'Combine colored ingredients into a visibly mixed pigment' },
  { id: 'C4', path: 'crafting', name: 'decorate objects', prerequisites: ['C3'], enabled: false, visibleProof: 'Apply marks to a finished pot, basket or toy' },
  { id: 'S1', path: 'cooperation', name: 'carry together', prerequisites: [], enabled: false, visibleProof: 'Two spirits lift, travel with and set down one shared piece' },
  { id: 'S2', path: 'cooperation', name: 'hold parts steady', prerequisites: ['B1'], enabled: false, visibleProof: 'One steadies a part while another qualified spirit fastens it' },
  { id: 'S3', path: 'cooperation', name: 'pass tools', prerequisites: [], enabled: false, visibleProof: 'One offers a tool and the other receives it, without duplicate ownership' },
  { id: 'S4', path: 'cooperation', name: 'demonstrate a skill', prerequisites: [], enabled: false, visibleProof: 'A spirit invites an unfamiliar observer and demonstrates that specific action' },
  { id: 'P1', path: 'play', name: 'balance', prerequisites: [], enabled: false, visibleProof: 'Step across a low balance prop with grounded corrective poses' },
  { id: 'P2', path: 'play', name: 'roll toward a target', prerequisites: [], enabled: false, visibleProof: 'Aim and roll a ball toward a marker; approach and retrieve it' },
  { id: 'P3', path: 'play', name: 'catch', prerequisites: ['P2'], enabled: false, visibleProof: 'Anticipate and receive a gentle authored toss' },
  { id: 'P4', path: 'play', name: 'pass to a partner', prerequisites: ['P3'], enabled: false, visibleProof: 'Two spirits take turns sending and receiving the ball' },
] as const satisfies readonly AbilityCatalogEntry[];

const ABILITY_BY_ID = new Map<AbilityId, AbilityCatalogEntry>(ABILITY_CATALOG.map(row => [row.id, row]));

export function isAbilityId(value: unknown): value is AbilityId {
  return typeof value === 'string' && ABILITY_BY_ID.has(value as AbilityId);
}

export function abilityDefinition(id: AbilityId): AbilityCatalogEntry | undefined {
  return ABILITY_BY_ID.get(id);
}

export function validateAbilityCatalog(): string[];
export function validateAbilityCatalog(catalog: readonly AbilityCatalogEntry[]): string[];
export function validateAbilityCatalog(catalog: readonly AbilityCatalogEntry[] = ABILITY_CATALOG): string[] {
  const errors: string[] = [];
  const rows = new Map<AbilityId, AbilityCatalogEntry>();

  for (const row of catalog) {
    if (rows.has(row.id)) errors.push(`Duplicate ability id: ${row.id}`);
    else rows.set(row.id, row);
  }

  for (const row of catalog) {
    for (const prerequisite of row.prerequisites) {
      if (!rows.has(prerequisite)) errors.push(`Unknown prerequisite for ${row.id}: ${prerequisite}`);
    }
  }

  const visited = new Set<AbilityId>();
  const visiting = new Set<AbilityId>();
  const path: AbilityId[] = [];
  const reportedCycles = new Set<string>();

  const visit = (id: AbilityId) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const cycleStart = path.indexOf(id);
      const cycle = [...path.slice(cycleStart), id].join(' -> ');
      if (!reportedCycles.has(cycle)) {
        reportedCycles.add(cycle);
        errors.push(`Prerequisite cycle: ${cycle}`);
      }
      return;
    }

    const row = rows.get(id);
    if (!row) return;
    visiting.add(id);
    path.push(id);
    for (const prerequisite of row.prerequisites) visit(prerequisite);
    path.pop();
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of rows.keys()) visit(id);
  return errors;
}
